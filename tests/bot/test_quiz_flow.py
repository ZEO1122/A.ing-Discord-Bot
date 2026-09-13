from __future__ import annotations

# pyright: reportMissingImports=false

from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from bot.cogs import quiz as quiz_module
from bot.cogs.quiz import QuizCog
from models.attempt import Attempt
from models.base import Base
from repositories.briefing_repository import BriefingRepository
from repositories.quiz_repository import QuizRepository


class FakeResponse:
    def __init__(self) -> None:
        self.messages: list[dict[str, object]] = []

    async def send_message(self, content: str | None = None, *, embed=None, view=None, ephemeral: bool = False) -> None:  # type: ignore[no-untyped-def]
        self.messages.append({"content": content, "embed": embed, "view": view, "ephemeral": ephemeral})


class FakeInteraction:
    def __init__(self, guild: object | None = object()) -> None:
        self.guild = guild
        self.channel_id = 555
        self.user = SimpleNamespace(id=2001, display_name="tester", name="tester")
        self.response = FakeResponse()


async def invoke_quiz_latest(cog: QuizCog, interaction: FakeInteraction) -> None:
    await cog.quiz_latest.callback(cog, interaction)


async def invoke_quiz_solve(cog: QuizCog, interaction: FakeInteraction, quiz_id: int, choice: int) -> None:
    await cog.quiz_solve.callback(cog, interaction, quiz_id=quiz_id, choice=choice)


def create_test_session() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    return session_factory()


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.mark.anyio
async def test_quiz_latest_returns_entry_ui(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    session = create_test_session()
    monkeypatch.setattr(quiz_module, "get_session", lambda: session)
    cog = QuizCog(SimpleNamespace())
    interaction = FakeInteraction(guild=object())

    await invoke_quiz_latest(cog, interaction)

    assert interaction.response.messages
    payload = interaction.response.messages[0]
    assert payload["embed"] is not None
    assert payload["view"] is not None


@pytest.mark.anyio
async def test_quiz_solve_records_attempt(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    session = create_test_session()
    briefing_repository = BriefingRepository(session)
    briefing = briefing_repository.ensure_sample_briefing()
    quiz_repository = QuizRepository(session)
    quiz = quiz_repository.ensure_sample_quiz(briefing)
    session.commit()

    monkeypatch.setattr(quiz_module, "get_session", lambda: session)
    cog = QuizCog(SimpleNamespace())
    interaction = FakeInteraction(guild=object())

    await invoke_quiz_solve(cog, interaction, quiz_id=quiz.id, choice=2)

    attempts = session.scalars(select(Attempt)).all()
    assert len(attempts) == 1
    assert "정답입니다" in str(interaction.response.messages[0]["content"])


@pytest.mark.anyio
async def test_quiz_solve_invalid_quiz_id_returns_error(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    session = create_test_session()
    monkeypatch.setattr(quiz_module, "get_session", lambda: session)
    cog = QuizCog(SimpleNamespace())
    interaction = FakeInteraction(guild=object())

    await invoke_quiz_solve(cog, interaction, quiz_id=9999, choice=1)

    assert "해당하는 퀴즈가 없습니다" in str(interaction.response.messages[0]["content"])


@pytest.mark.anyio
async def test_quiz_command_requires_guild(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    session = create_test_session()
    monkeypatch.setattr(quiz_module, "get_session", lambda: session)
    cog = QuizCog(SimpleNamespace())
    interaction = FakeInteraction(guild=None)

    await invoke_quiz_latest(cog, interaction)

    assert "서버 안에서만" in str(interaction.response.messages[0]["content"])
