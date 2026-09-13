from __future__ import annotations

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from models.attempt import Attempt
from models.base import Base
from repositories.attempt_repository import AttemptRepository
from repositories.briefing_repository import BriefingRepository
from repositories.quiz_repository import QuizRepository
from services.attempt_recording_service import AttemptRecordingService
from services.grading_service import GradingService
from services.private_feedback_renderer import PrivateFeedbackRenderer
from services.submission_handler import QuizNotFoundError, SubmissionHandlerService


def create_test_session() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    return session_factory()


def build_submission_handler(session: Session) -> tuple[SubmissionHandlerService, QuizRepository]:
    briefing_repository = BriefingRepository(session)
    briefing = briefing_repository.ensure_sample_briefing()
    quiz_repository = QuizRepository(session)
    quiz_repository.ensure_sample_quiz(briefing)
    session.commit()

    handler = SubmissionHandlerService(
        quiz_repository=quiz_repository,
        attempt_repository=AttemptRepository(session),
        attempt_recording_service=AttemptRecordingService(session),
        grading_service=GradingService(),
        feedback_renderer=PrivateFeedbackRenderer(),
    )
    return handler, quiz_repository


def test_normal_submission_creates_attempt() -> None:
    session = create_test_session()
    handler, quiz_repository = build_submission_handler(session)
    quiz = quiz_repository.get_latest_open()
    assert quiz is not None

    result = handler.submit_multiple_choice(
        discord_user_id="1001",
        display_name="tester",
        username="tester",
        quiz_id=quiz.id,
        selected_choice=2,
    )
    session.commit()

    attempts = session.scalars(select(Attempt)).all()
    assert result.is_correct is True
    assert result.attempt_no == 1
    assert len(attempts) == 1
    assert attempts[0].quiz_id == quiz.id
    assert attempts[0].score == 10


def test_duplicate_submission_creates_second_attempt() -> None:
    session = create_test_session()
    handler, quiz_repository = build_submission_handler(session)
    quiz = quiz_repository.get_latest_open()
    assert quiz is not None

    first = handler.submit_multiple_choice(
        discord_user_id="1001",
        display_name="tester",
        username="tester",
        quiz_id=quiz.id,
        selected_choice=2,
    )
    second = handler.submit_multiple_choice(
        discord_user_id="1001",
        display_name="tester",
        username="tester",
        quiz_id=quiz.id,
        selected_choice=2,
    )
    session.commit()

    attempts = session.scalars(select(Attempt).order_by(Attempt.attempt_no.asc())).all()
    assert first.attempt_no == 1
    assert second.attempt_no == 2
    assert len(attempts) == 2
    assert attempts[1].attempt_no == 2
    assert attempts[1].score == 4


def test_invalid_quiz_id_raises_error() -> None:
    session = create_test_session()
    handler, _ = build_submission_handler(session)

    try:
        handler.submit_multiple_choice(
            discord_user_id="1001",
            display_name="tester",
            username="tester",
            quiz_id=99999,
            selected_choice=1,
        )
    except QuizNotFoundError:
        pass
    else:
        raise AssertionError("Expected QuizNotFoundError for invalid quiz id")
