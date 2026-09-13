from __future__ import annotations

# pyright: reportMissingImports=false

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import cast

import discord
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from bot.cogs import stats as stats_module
from bot.cogs.stats import StatsCog
from models.base import Base
from repositories.briefing_repository import BriefingRepository
from repositories.quiz_repository import QuizRepository
from services.attempt_recording_service import AttemptRecordingService
from services.grading_service import GradeResult


class FakeResponse:
    def __init__(self) -> None:
        self.messages: list[dict[str, object]] = []

    async def send_message(
        self,
        content: str | None = None,
        *,
        embed: discord.Embed | None = None,
        ephemeral: bool = False,
    ) -> None:
        self.messages.append({"content": content, "embed": embed, "ephemeral": ephemeral})


class FakeInteraction:
    def __init__(self, user_id: int, guild: object | None = object()) -> None:
        self.guild = guild
        self.user = SimpleNamespace(id=user_id)
        self.response = FakeResponse()


def create_test_session() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    return session_factory()


def seed_attempts(session: Session) -> int:
    now = datetime.now(timezone.utc)
    briefing_repository = BriefingRepository(session)
    briefing = briefing_repository.ensure_sample_briefing()
    quiz_repository = QuizRepository(session)
    quiz = quiz_repository.ensure_sample_quiz(briefing)
    recording_service = AttemptRecordingService(session)
    recording_service.record_attempt(
        discord_user_id="2001",
        display_name="alpha",
        username="alpha",
        quiz_id=quiz.id,
        raw_answer="2",
        grade_result=GradeResult(normalized_answer="2", is_correct=True, score=10, explanation="ok"),
        attempt_no=1,
        submitted_at=now - timedelta(days=2),
    )
    recording_service.record_attempt(
        discord_user_id="2001",
        display_name="alpha",
        username="alpha",
        quiz_id=quiz.id,
        raw_answer="1",
        grade_result=GradeResult(normalized_answer="1", is_correct=False, score=1, explanation="no"),
        attempt_no=2,
        submitted_at=now - timedelta(hours=4),
    )
    recording_service.record_attempt(
        discord_user_id="3001",
        display_name="beta",
        username="beta",
        quiz_id=quiz.id,
        raw_answer="2",
        grade_result=GradeResult(normalized_answer="2", is_correct=True, score=10, explanation="ok"),
        attempt_no=1,
        submitted_at=now - timedelta(days=10),
    )
    session.commit()
    return quiz.id


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


async def invoke_stats_me(cog: StatsCog, interaction: FakeInteraction, **kwargs: object) -> None:
    await cog.me.callback(cog, interaction, **kwargs)


@pytest.mark.anyio
async def test_stats_me_returns_current_user_only(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    session = create_test_session()
    seed_attempts(session)
    monkeypatch.setattr(stats_module, "get_session", lambda: session)

    cog = StatsCog(SimpleNamespace())
    interaction = FakeInteraction(user_id=2001, guild=object())

    await invoke_stats_me(cog, interaction)

    embed = cast(discord.Embed, interaction.response.messages[0]["embed"])
    assert embed.description is not None
    assert "응답 수: 2" in embed.description
    assert "정답 수: 1" in embed.description
    assert "첫 제출 수: 1" in embed.description
    assert "첫 시도 정답 수: 1" in embed.description
    assert "첫 시도 기준 정답률: 100.0%" in embed.description
    assert "전체 제출 기준 정답률: 50.0%" in embed.description
    assert "beta" not in (embed.title or "")


@pytest.mark.anyio
async def test_stats_me_returns_no_data_message(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    session = create_test_session()
    monkeypatch.setattr(stats_module, "get_session", lambda: session)

    cog = StatsCog(SimpleNamespace())
    interaction = FakeInteraction(user_id=9999, guild=object())

    await invoke_stats_me(cog, interaction)

    assert interaction.response.messages[0]["content"] == "아직 기록된 응답이 없습니다."


@pytest.mark.anyio
async def test_stats_me_separates_other_user_data(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    session = create_test_session()
    seed_attempts(session)
    monkeypatch.setattr(stats_module, "get_session", lambda: session)

    cog = StatsCog(SimpleNamespace())
    interaction = FakeInteraction(user_id=3001, guild=object())

    await invoke_stats_me(cog, interaction)

    embed = cast(discord.Embed, interaction.response.messages[0]["embed"])
    assert embed.description is not None
    assert "응답 수: 1" in embed.description
    assert "정답 수: 1" in embed.description
    assert "첫 제출 수: 1" in embed.description
    assert "첫 시도 정답 수: 1" in embed.description
    assert "첫 시도 기준 정답률: 100.0%" in embed.description
    assert "전체 제출 기준 정답률: 100.0%" in embed.description
    assert "응답 수: 2" not in embed.description


@pytest.mark.anyio
async def test_stats_me_supports_quiz_and_period_filters(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    session = create_test_session()
    quiz_id = seed_attempts(session)
    monkeypatch.setattr(stats_module, "get_session", lambda: session)

    cog = StatsCog(SimpleNamespace())
    interaction = FakeInteraction(user_id=2001, guild=object())

    await invoke_stats_me(cog, interaction, quiz_id=quiz_id, period="week")

    embed = cast(discord.Embed, interaction.response.messages[0]["embed"])
    assert embed.title == f"alpha의 학습 통계 | quiz_id={quiz_id} | period=week"
    assert embed.description is not None
    assert "응답 수: 2" in embed.description
    assert "첫 제출 수: 1" in embed.description
    assert "첫 시도 기준 정답률: 100.0%" in embed.description
    assert "전체 제출 기준 정답률: 50.0%" in embed.description


@pytest.mark.anyio
async def test_stats_me_returns_no_data_for_period_filter(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    session = create_test_session()
    seed_attempts(session)
    monkeypatch.setattr(stats_module, "get_session", lambda: session)

    cog = StatsCog(SimpleNamespace())
    interaction = FakeInteraction(user_id=3001, guild=object())

    await invoke_stats_me(cog, interaction, period="week")

    assert interaction.response.messages[0]["content"] == "아직 기록된 응답이 없습니다."
