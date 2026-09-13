from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from models.base import Base
from models.quiz import Quiz
from repositories.attempt_repository import AttemptRepository
from repositories.briefing_repository import BriefingRepository
from repositories.quiz_repository import QuizRepository
from services.attempt_recording_service import AttemptRecordingService
from services.grading_service import GradeResult
from services.stats_query_service import StatsQueryService


def create_test_session() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    return session_factory()


def seed_multi_quiz_attempts(session: Session) -> tuple[int, int]:
    now = datetime.now(timezone.utc)
    briefing_repository = BriefingRepository(session)
    briefing = briefing_repository.ensure_sample_briefing()

    quiz_repository = QuizRepository(session)
    quiz_one = quiz_repository.ensure_sample_quiz(briefing)
    quiz_two = quiz_repository.add(
        Quiz(
            briefing_id=briefing.id,
            quiz_type="mcq",
            question="두 번째 퀴즈",
            answer_key_json=json.dumps([1]),
            explanation="second",
            status="open",
            opens_at=now - timedelta(days=1),
        )
    )

    recording_service = AttemptRecordingService(session)
    recording_service.record_attempt(
        discord_user_id="5001",
        display_name="alpha",
        username="alpha",
        quiz_id=quiz_one.id,
        raw_answer="2",
        grade_result=GradeResult(normalized_answer="2", is_correct=True, score=10, explanation="ok"),
        attempt_no=1,
        submitted_at=now - timedelta(days=2),
    )
    recording_service.record_attempt(
        discord_user_id="5001",
        display_name="alpha",
        username="alpha",
        quiz_id=quiz_one.id,
        raw_answer="2",
        grade_result=GradeResult(normalized_answer="2", is_correct=True, score=4, explanation="ok"),
        attempt_no=2,
        submitted_at=now - timedelta(hours=1),
    )
    recording_service.record_attempt(
        discord_user_id="5001",
        display_name="alpha",
        username="alpha",
        quiz_id=quiz_two.id,
        raw_answer="2",
        grade_result=GradeResult(normalized_answer="2", is_correct=False, score=1, explanation="no"),
        attempt_no=1,
        submitted_at=now - timedelta(hours=2),
    )
    recording_service.record_attempt(
        discord_user_id="5001",
        display_name="alpha",
        username="alpha",
        quiz_id=quiz_two.id,
        raw_answer="1",
        grade_result=GradeResult(normalized_answer="1", is_correct=True, score=4, explanation="yes"),
        attempt_no=2,
        submitted_at=now - timedelta(minutes=30),
    )
    session.commit()
    return quiz_one.id, quiz_two.id


def test_user_stats_first_try_accuracy_uses_per_quiz_first_attempts() -> None:
    session = create_test_session()
    seed_multi_quiz_attempts(session)
    stats_service = StatsQueryService(AttemptRepository(session))

    stats = stats_service.get_user_stats(discord_user_id="5001")

    assert stats is not None
    assert stats.total_attempts == 4
    assert stats.correct_attempts == 3
    assert stats.first_attempts == 2
    assert stats.first_try_corrects == 1
    assert stats.first_try_accuracy_rate == 50.0
    assert stats.overall_accuracy_rate == 75.0


def test_overall_stats_first_try_accuracy_differs_from_overall_accuracy() -> None:
    session = create_test_session()
    seed_multi_quiz_attempts(session)
    stats_service = StatsQueryService(AttemptRepository(session))

    stats = stats_service.get_overall_stats()

    assert stats is not None
    assert stats.first_attempts == 2
    assert stats.first_try_corrects == 1
    assert stats.first_try_accuracy_rate == 50.0
    assert stats.overall_accuracy_rate == 75.0


def test_period_filtered_stats_keep_only_recent_first_attempts() -> None:
    session = create_test_session()
    _, quiz_two_id = seed_multi_quiz_attempts(session)
    stats_service = StatsQueryService(AttemptRepository(session))

    stats = stats_service.get_quiz_stats(quiz_two_id, period="week")

    assert stats is not None
    assert stats.first_attempts == 1
    assert stats.first_try_corrects == 0
    assert stats.first_try_accuracy_rate == 0.0
    assert stats.overall_accuracy_rate == 50.0
