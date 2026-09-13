from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from models.base import Base
from repositories.briefing_repository import BriefingRepository
from repositories.publish_log_repository import PublishLogRepository
from services.publish_service import InMemoryPublisher, PublishService


def create_test_session() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    return session_factory()


def test_publish_latest_briefing_marks_briefing_and_writes_log() -> None:
    session = create_test_session()
    briefing_repository = BriefingRepository(session)
    publish_log_repository = PublishLogRepository(session)
    briefing = briefing_repository.ensure_sample_briefing(track="dl-basics")

    service = PublishService(briefing_repository, publish_log_repository)
    result = service.publish_latest_briefing(
        track="dl-basics",
        channel_id="test-channel",
        publisher=InMemoryPublisher(),
    )
    session.commit()

    refreshed = briefing_repository.get_by_briefing_key(briefing.briefing_key)
    publish_log = publish_log_repository.get_latest_for_briefing(briefing.id)

    assert result.publish_status == "success"
    assert result.discord_message_id == f"dry-run-{briefing.briefing_key}"
    assert refreshed is not None
    assert refreshed.status == "published"
    assert publish_log is not None
    assert publish_log.publish_status == "success"
    assert publish_log.discord_message_id == f"dry-run-{briefing.briefing_key}"
