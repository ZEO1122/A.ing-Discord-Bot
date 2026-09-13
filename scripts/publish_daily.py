from __future__ import annotations

# pyright: reportMissingImports=false

import argparse
import logging
from pathlib import Path
import sys


def bootstrap_pythonpath() -> None:
    root = Path(__file__).resolve().parents[1]
    src = root / "src"
    if str(src) not in sys.path:
        sys.path.insert(0, str(src))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Publish the latest dl-basics briefing.")
    parser.add_argument("--track", default="dl-basics")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def configure_logging() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


def main() -> None:
    bootstrap_pythonpath()

    from core.config import get_settings
    from core.db import create_all_tables, get_session
    from repositories.briefing_repository import BriefingRepository
    from repositories.publish_log_repository import PublishLogRepository
    from services.publish_service import DiscordWebhookPublisher, InMemoryPublisher, PublishService

    configure_logging()
    args = parse_args()
    settings = get_settings()
    create_all_tables()
    session = get_session()
    try:
        briefing_repository = BriefingRepository(session)
        publish_log_repository = PublishLogRepository(session)
        briefing = briefing_repository.ensure_sample_briefing(track=args.track)

        if args.dry_run or not settings.discord_webhook_url:
            publisher = InMemoryPublisher()
            channel_id = settings.discord_brief_channel_id or "dry-run-channel"
        else:
            publisher = DiscordWebhookPublisher(settings.discord_webhook_url)
            channel_id = settings.discord_brief_channel_id or "webhook-channel"

        service = PublishService(briefing_repository, publish_log_repository)
        result = service.publish_latest_briefing(track=briefing.track, channel_id=channel_id, publisher=publisher)
        session.commit()
        print(f"publish_status={result.publish_status} discord_message_id={result.discord_message_id}")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
