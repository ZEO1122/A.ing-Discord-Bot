from __future__ import annotations

# pyright: reportMissingImports=false

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import cast

import pytest
import discord
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from bot.cogs import admin as admin_module
from bot.cogs.admin import AdminCog
from models.base import Base
from repositories.briefing_repository import BriefingRepository
from repositories.publish_log_repository import PublishLogRepository
from repositories.quiz_repository import QuizRepository
from services.attempt_recording_service import AttemptRecordingService
from services.grading_service import GradeResult


class DummyPublisher:
    def __init__(self, webhook_url: str) -> None:
        self.webhook_url = webhook_url

    def publish(self, briefing, payload) -> str:  # type: ignore[no-untyped-def]
        return f"dummy-message-{briefing.id}"


class FakeResponse:
    def __init__(self) -> None:
        self.messages: list[dict[str, object]] = []
        self.deferred = False

    async def send_message(
        self,
        content: str | None = None,
        *,
        embed: discord.Embed | None = None,
        ephemeral: bool = False,
    ) -> None:
        self.messages.append({"content": content, "embed": embed, "ephemeral": ephemeral})

    async def defer(self, ephemeral: bool = False, thinking: bool = False) -> None:
        self.deferred = True
        self.messages.append({"deferred": True, "ephemeral": ephemeral, "thinking": thinking})


class FakeFollowup:
    def __init__(self) -> None:
        self.messages: list[dict[str, object]] = []

    async def send(self, content: str, ephemeral: bool = False) -> None:
        self.messages.append({"content": content, "ephemeral": ephemeral})


class FakeInteraction:
    def __init__(self, *, is_admin: bool = True, guild: object | None = None) -> None:
        self.guild = SimpleNamespace(id=1) if guild is None else guild
        self.channel_id = 999
        self.user = SimpleNamespace(id=1234, guild_permissions=SimpleNamespace(administrator=is_admin))
        self.response = FakeResponse()
        self.followup = FakeFollowup()


def create_test_session() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    return session_factory()


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


async def invoke_publish(cog: AdminCog, interaction: FakeInteraction, **kwargs: object) -> None:
    await cog.publish.callback(cog, interaction, **kwargs)


async def invoke_stats(cog: AdminCog, interaction: FakeInteraction, **kwargs: object) -> None:
    await cog.admin_stats.callback(cog, interaction, **kwargs)


@pytest.mark.anyio
async def test_admin_publish_by_content_id(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    session = create_test_session()
    briefing_repository = BriefingRepository(session)
    publish_log_repository = PublishLogRepository(session)
    briefing = briefing_repository.ensure_sample_briefing()
    session.commit()

    monkeypatch.setattr(admin_module, "get_session", lambda: session)
    monkeypatch.setattr(
        admin_module,
        "get_settings",
        lambda: SimpleNamespace(discord_webhook_url="https://example.com/webhook", discord_brief_channel_id="brief-channel"),
    )
    monkeypatch.setattr(admin_module, "DiscordWebhookPublisher", DummyPublisher)

    cog = AdminCog(SimpleNamespace())
    interaction = FakeInteraction()

    await invoke_publish(cog, interaction, content_id=briefing.id, briefing_key=None)

    publish_log = publish_log_repository.get_latest_for_briefing(briefing.id)
    assert interaction.response.deferred is True
    assert interaction.followup.messages
    assert "게시 성공" in str(interaction.followup.messages[0]["content"])
    assert publish_log is not None
    assert publish_log.publish_status == "success"


def seed_attempts(session: Session) -> int:
    now = datetime.now(timezone.utc)
    briefing_repository = BriefingRepository(session)
    briefing = briefing_repository.ensure_sample_briefing()
    quiz_repository = QuizRepository(session)
    quiz = quiz_repository.ensure_sample_quiz(briefing)
    recording_service = AttemptRecordingService(session)
    recording_service.record_attempt(
        discord_user_id="1001",
        display_name="alpha",
        username="alpha",
        quiz_id=quiz.id,
        raw_answer="2",
        grade_result=GradeResult(normalized_answer="2", is_correct=True, score=10, explanation="ok"),
        attempt_no=1,
        submitted_at=now - timedelta(days=2),
    )
    recording_service.record_attempt(
        discord_user_id="1002",
        display_name="beta",
        username="beta",
        quiz_id=quiz.id,
        raw_answer="1",
        grade_result=GradeResult(normalized_answer="1", is_correct=False, score=1, explanation="no"),
        attempt_no=1,
        submitted_at=now - timedelta(days=10),
    )
    recording_service.record_attempt(
        discord_user_id="1001",
        display_name="alpha",
        username="alpha",
        quiz_id=quiz.id,
        raw_answer="2",
        grade_result=GradeResult(normalized_answer="2", is_correct=True, score=4, explanation="ok"),
        attempt_no=2,
        submitted_at=now - timedelta(hours=12),
    )
    session.commit()
    return quiz.id


@pytest.mark.anyio
async def test_admin_publish_by_briefing_key(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    session = create_test_session()
    briefing_repository = BriefingRepository(session)
    publish_log_repository = PublishLogRepository(session)
    briefing = briefing_repository.ensure_sample_briefing()
    session.commit()

    monkeypatch.setattr(admin_module, "get_session", lambda: session)
    monkeypatch.setattr(
        admin_module,
        "get_settings",
        lambda: SimpleNamespace(discord_webhook_url="https://example.com/webhook", discord_brief_channel_id="brief-channel"),
    )
    monkeypatch.setattr(admin_module, "DiscordWebhookPublisher", DummyPublisher)

    cog = AdminCog(SimpleNamespace())
    interaction = FakeInteraction()

    await invoke_publish(cog, interaction, content_id=None, briefing_key=briefing.briefing_key)

    publish_log = publish_log_repository.get_latest_for_briefing(briefing.id)
    assert interaction.response.deferred is True
    assert interaction.followup.messages
    assert briefing.briefing_key in str(interaction.followup.messages[0]["content"])
    assert publish_log is not None
    assert publish_log.publish_status == "success"


@pytest.mark.anyio
async def test_admin_stats_returns_user_attempt_summary(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    session = create_test_session()
    quiz_id = seed_attempts(session)
    monkeypatch.setattr(admin_module, "get_session", lambda: session)

    cog = AdminCog(SimpleNamespace())
    interaction = FakeInteraction(is_admin=True)

    await invoke_stats(cog, interaction, quiz_id=quiz_id)

    assert interaction.response.messages
    embed = cast(discord.Embed, interaction.response.messages[0]["embed"])
    assert embed is not None
    assert embed.description is not None
    assert "응답 수: 3" in embed.description
    assert "정답 수: 2" in embed.description
    assert "첫 제출 수: 2" in embed.description
    assert "첫 시도 정답 수: 1" in embed.description
    assert "첫 시도 기준 정답률: 50.0%" in embed.description
    assert "전체 제출 기준 정답률: 66.7%" in embed.description
    assert len(embed.fields) >= 2
    values = "\n".join(str(field.value) for field in embed.fields)
    assert "응답 수" in values
    assert "정답 수" in values
    assert "첫 제출 수" in values
    assert "첫 시도 정답 수" in values
    assert "첫 시도 기준 정답률" in values
    assert "전체 제출 기준 정답률" in values
    assert "최근 응답" in values


@pytest.mark.anyio
async def test_admin_stats_returns_quiz_specific_summary(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    session = create_test_session()
    quiz_id = seed_attempts(session)
    monkeypatch.setattr(admin_module, "get_session", lambda: session)

    cog = AdminCog(SimpleNamespace())
    interaction = FakeInteraction(is_admin=True)

    await invoke_stats(cog, interaction, quiz_id=quiz_id)

    embed = cast(discord.Embed, interaction.response.messages[0]["embed"])
    assert embed.title == f"관리자 통계 | quiz_id={quiz_id}"
    assert embed.description is not None
    assert "첫 시도 기준 정답률: 50.0%" in embed.description
    assert "전체 제출 기준 정답률: 66.7%" in embed.description


@pytest.mark.anyio
async def test_admin_stats_returns_period_filtered_summary(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    session = create_test_session()
    seed_attempts(session)
    monkeypatch.setattr(admin_module, "get_session", lambda: session)

    cog = AdminCog(SimpleNamespace())
    interaction = FakeInteraction(is_admin=True)

    await invoke_stats(cog, interaction, period="week")

    embed = cast(discord.Embed, interaction.response.messages[0]["embed"])
    assert embed.title == "관리자 통계 | period=week"
    assert embed.description is not None
    assert "응답 수: 2" in embed.description
    assert "정답 수: 2" in embed.description
    assert "첫 제출 수: 1" in embed.description
    assert "첫 시도 정답 수: 1" in embed.description
    assert "첫 시도 기준 정답률: 100.0%" in embed.description
    assert "전체 제출 기준 정답률: 100.0%" in embed.description


@pytest.mark.anyio
async def test_admin_stats_returns_no_data_message(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    session = create_test_session()
    monkeypatch.setattr(admin_module, "get_session", lambda: session)

    cog = AdminCog(SimpleNamespace())
    interaction = FakeInteraction(is_admin=True)

    await invoke_stats(cog, interaction, quiz_id=None)

    assert interaction.response.messages
    assert interaction.response.messages[0]["content"] == "조회할 통계가 없습니다."


@pytest.mark.anyio
async def test_admin_stats_requires_admin_permission(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    session = create_test_session()
    seed_attempts(session)
    monkeypatch.setattr(admin_module, "get_session", lambda: session)

    cog = AdminCog(SimpleNamespace())
    interaction = FakeInteraction(is_admin=False)

    await invoke_stats(cog, interaction, quiz_id=None)

    assert interaction.response.messages
    assert interaction.response.messages[0]["content"] == "관리자 권한이 필요합니다."
