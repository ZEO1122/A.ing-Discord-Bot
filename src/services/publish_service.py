from __future__ import annotations

# pyright: reportMissingImports=false

from dataclasses import dataclass
from datetime import datetime, timezone
import logging
from typing import Protocol, TypedDict

import discord

from models.briefing import Briefing
from models.publish_log import PublishLog
from repositories.briefing_repository import BriefingRepository
from repositories.publish_log_repository import PublishLogRepository


logger = logging.getLogger(__name__)


class Publisher(Protocol):
    def publish(self, briefing: Briefing, payload: EmbedPayload) -> str:
        ...


class EmbedField(TypedDict):
    name: str
    value: str
    inline: bool


class EmbedPayload(TypedDict):
    title: str
    description: str
    fields: list[EmbedField]


@dataclass(slots=True)
class PublishResult:
    discord_message_id: str | None
    publish_status: str
    error_message: str | None = None


class PublishFlowError(RuntimeError):
    pass


class DiscordWebhookPublisher:
    def __init__(self, webhook_url: str) -> None:
        self.webhook = discord.SyncWebhook.from_url(webhook_url)

    def publish(self, briefing: Briefing, payload: EmbedPayload) -> str:
        embed = discord.Embed(
            title=str(payload["title"]),
            description=str(payload["description"]),
            color=discord.Color.blue(),
        )
        for field in payload["fields"]:
            embed.add_field(
                name=str(field["name"]),
                value=str(field["value"]),
                inline=bool(field.get("inline", False)),
            )

        message = self.webhook.send(
            content=f"오늘의 브리핑 - {briefing.track}",
            embed=embed,
            wait=True,
        )
        return str(message.id)


class InMemoryPublisher:
    def publish(self, briefing: Briefing, payload: EmbedPayload) -> str:
        logger.info("Dry run publish for briefing=%s title=%s", briefing.briefing_key, payload["title"])
        return f"dry-run-{briefing.briefing_key}"


class PublishService:
    def __init__(
        self,
        briefing_repository: BriefingRepository,
        publish_log_repository: PublishLogRepository,
    ) -> None:
        self.briefing_repository = briefing_repository
        self.publish_log_repository = publish_log_repository

    def build_embed_payload(self, briefing: Briefing) -> EmbedPayload:
        source_lines = [f"- {source.title}: {source.url}" for source in briefing.sources]
        sources = "\n".join(source_lines) if source_lines else "- 출처 없음"
        return {
            "title": briefing.title,
            "description": briefing.one_line,
            "fields": [
                {"name": "무슨 내용인가", "value": briefing.what_happened, "inline": False},
                {"name": "왜 중요한가", "value": briefing.why_it_matters, "inline": False},
                {"name": "생각해볼 질문", "value": briefing.discussion_prompt or "아직 준비되지 않았습니다.", "inline": False},
                {"name": "출처", "value": sources, "inline": False},
            ],
        }

    def build_publish_log(
        self,
        briefing_id: int,
        channel_id: str,
        result: PublishResult,
        quiz_id: int | None = None,
    ) -> PublishLog:
        published_at = datetime.now(timezone.utc) if result.publish_status == "success" else None
        return PublishLog(
            briefing_id=briefing_id,
            quiz_id=quiz_id,
            discord_channel_id=channel_id,
            discord_message_id=result.discord_message_id,
            publish_status=result.publish_status,
            error_message=result.error_message,
            published_at=published_at,
        )

    def get_latest_briefing_payload(self, track: str) -> tuple[Briefing, EmbedPayload]:
        briefing = self.briefing_repository.get_latest_published(track)
        if briefing is None:
            raise PublishFlowError(f"No published briefing found for track={track}")
        return briefing, self.build_embed_payload(briefing)

    def publish_briefing(
        self,
        briefing: Briefing,
        channel_id: str,
        publisher: Publisher,
    ) -> PublishResult:
        payload = self.build_embed_payload(briefing)

        try:
            discord_message_id = publisher.publish(briefing, payload)
            self.briefing_repository.mark_published(briefing)
            result = PublishResult(discord_message_id=discord_message_id, publish_status="success")
            logger.info("Published briefing briefing_key=%s message_id=%s", briefing.briefing_key, discord_message_id)
        except Exception as exc:
            result = PublishResult(
                discord_message_id=None,
                publish_status="failed",
                error_message=str(exc),
            )
            logger.exception("Failed to publish briefing briefing_key=%s", briefing.briefing_key)

        publish_log = self.build_publish_log(
            briefing_id=briefing.id,
            channel_id=channel_id,
            result=result,
        )
        self.publish_log_repository.add(publish_log)
        return result

    def publish_latest_briefing(
        self,
        track: str,
        channel_id: str,
        publisher: Publisher,
    ) -> PublishResult:
        briefing = self.briefing_repository.get_latest_ready(track)
        if briefing is None:
            raise PublishFlowError(f"No briefing found for track={track}")

        return self.publish_briefing(briefing=briefing, channel_id=channel_id, publisher=publisher)
