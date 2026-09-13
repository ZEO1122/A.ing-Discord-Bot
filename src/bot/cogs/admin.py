from __future__ import annotations

# pyright: reportMissingImports=false

import discord
from discord import app_commands
from discord.ext import commands
from datetime import datetime
import logging
from typing import Literal, cast

from core.config import get_settings
from core.db import get_session
from repositories.attempt_repository import AttemptRepository
from repositories.briefing_repository import BriefingRepository
from repositories.publish_log_repository import PublishLogRepository
from services.publish_service import DiscordWebhookPublisher, PublishFlowError, PublishService
from services.stats_query_service import Period, StatsQueryService


logger = logging.getLogger(__name__)


def _format_timestamp(value: datetime | None) -> str:
    if value is not None:
        return cast(datetime, value).strftime("%Y-%m-%d %H:%M:%S UTC")
    return "없음"


def _format_stats_title(base: str, quiz_id: int | None, period: str | None) -> str:
    title = base
    if quiz_id is not None:
        title = f"{title} | quiz_id={quiz_id}"
    if period is not None:
        title = f"{title} | period={period}"
    return title


def _has_admin_permission(interaction: discord.Interaction) -> bool:
    permissions = getattr(interaction.user, "guild_permissions", None)
    return bool(permissions and getattr(permissions, "administrator", False))


class AdminCog(commands.GroupCog, group_name="admin", group_description="관리자 명령"):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="publish", description="브리핑을 관리자 권한으로 게시합니다.")
    @app_commands.default_permissions(administrator=True)
    async def publish(
        self,
        interaction: discord.Interaction,
        content_id: int | None = None,
        briefing_key: str | None = None,
    ) -> None:
        logger.info(
            "Admin publish invoked user_id=%s guild_id=%s channel_id=%s content_id=%s briefing_key=%s",
            getattr(interaction.user, "id", None),
            getattr(interaction.guild, "id", None),
            getattr(interaction, "channel_id", None),
            content_id,
            briefing_key,
        )
        if interaction.guild is None:
            await interaction.response.send_message("관리자 게시 명령은 서버 안에서만 사용할 수 있습니다.", ephemeral=True)
            return

        if not _has_admin_permission(interaction):
            await interaction.response.send_message("관리자 권한이 필요합니다.", ephemeral=True)
            return

        if (content_id is None and briefing_key is None) or (content_id is not None and briefing_key is not None):
            await interaction.response.send_message(
                "`content_id` 또는 `briefing_key` 중 하나만 입력해 주세요.",
                ephemeral=True,
            )
            return

        settings = get_settings()
        if not settings.discord_webhook_url:
            await interaction.response.send_message(
                "`DISCORD_WEBHOOK_URL`이 설정되어 있지 않아 게시할 수 없습니다.",
                ephemeral=True,
            )
            return

        await interaction.response.defer(ephemeral=True, thinking=True)

        session = get_session()
        try:
            briefing_repository = BriefingRepository(session)
            publish_log_repository = PublishLogRepository(session)
            publish_service = PublishService(briefing_repository, publish_log_repository)

            if content_id is not None:
                briefing = briefing_repository.get_by_id(content_id)
            else:
                briefing = briefing_repository.get_by_briefing_key(briefing_key or "")

            if briefing is None:
                await interaction.followup.send("해당 브리핑을 찾을 수 없습니다.", ephemeral=True)
                return

            publisher = DiscordWebhookPublisher(settings.discord_webhook_url)
            channel_id = settings.discord_brief_channel_id or str(interaction.channel_id)
            result = publish_service.publish_briefing(
                briefing=briefing,
                channel_id=channel_id,
                publisher=publisher,
            )

            if result.publish_status == "success":
                session.commit()
                logger.info(
                    "Admin published briefing briefing_id=%s briefing_key=%s by user=%s message_id=%s",
                    briefing.id,
                    briefing.briefing_key,
                    interaction.user.id,
                    result.discord_message_id,
                )
                await interaction.followup.send(
                    f"게시 성공: briefing_id={briefing.id}, briefing_key={briefing.briefing_key}, "
                    f"message_id={result.discord_message_id}",
                    ephemeral=True,
                )
            else:
                session.commit()
                logger.warning(
                    "Admin publish failed briefing_id=%s briefing_key=%s by user=%s error=%s",
                    briefing.id,
                    briefing.briefing_key,
                    interaction.user.id,
                    result.error_message,
                )
                await interaction.followup.send(
                    f"게시 실패: briefing_id={briefing.id}, briefing_key={briefing.briefing_key}, "
                    f"error={result.error_message}",
                    ephemeral=True,
                )
        except PublishFlowError as exc:
            session.rollback()
            logger.warning("Admin publish blocked: %s", exc)
            await interaction.followup.send(str(exc), ephemeral=True)
        except Exception as exc:
            session.rollback()
            logger.exception("Unexpected admin publish failure")
            await interaction.followup.send(f"예상치 못한 오류가 발생했습니다: {exc}", ephemeral=True)
        finally:
            session.close()

    @app_commands.command(name="stats", description="관리자 통계를 조회합니다.")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(period="today/week/month 중 하나")
    @app_commands.choices(
        period=[
            app_commands.Choice(name="today", value="today"),
            app_commands.Choice(name="week", value="week"),
            app_commands.Choice(name="month", value="month"),
        ]
    )
    async def admin_stats(
        self,
        interaction: discord.Interaction,
        quiz_id: int | None = None,
        period: Literal["today", "week", "month"] | None = None,
    ) -> None:
        if interaction.guild is None:
            await interaction.response.send_message("관리자 통계 명령은 서버 안에서만 사용할 수 있습니다.", ephemeral=True)
            return

        if not _has_admin_permission(interaction):
            await interaction.response.send_message("관리자 권한이 필요합니다.", ephemeral=True)
            return

        session = get_session()
        try:
            stats_service = StatsQueryService(AttemptRepository(session))
            period_filter = cast(Period | None, period)
            overall_stats = stats_service.get_overall_stats(quiz_id=quiz_id, period=period_filter)
            stats_rows = stats_service.get_user_attempt_stats(quiz_id=quiz_id, period=period_filter)
            if overall_stats is None or not stats_rows:
                await interaction.response.send_message("조회할 통계가 없습니다.", ephemeral=True)
                return

            title = _format_stats_title("관리자 통계", quiz_id, period)

            embed = discord.Embed(title=title, color=discord.Color.gold())
            embed.description = (
                "[요약]\n"
                f"참여자 수: {overall_stats.participants}\n"
                f"총 응답 수: {overall_stats.total_attempts}\n"
                f"총 정답 수: {overall_stats.correct_attempts}\n"
                f"첫 제출 수: {overall_stats.first_attempts}\n"
                f"첫 시도 정답 수: {overall_stats.first_try_corrects}\n"
                f"첫 시도 기준 정답률: {overall_stats.first_try_accuracy_rate:.1f}%\n"
                f"전체 제출 기준 정답률: {overall_stats.overall_accuracy_rate:.1f}%"
            )
            for row in stats_rows[:10]:
                display_name = row.display_name or row.discord_user_id
                last_answered_at = _format_timestamp(row.last_answered_at)
                embed.add_field(
                    name=display_name,
                    value=(
                        f"총 응답 수: {row.total_attempts}\n"
                        f"총 정답 수: {row.correct_attempts}\n"
                        f"첫 제출 수: {row.first_attempts}\n"
                        f"첫 시도 정답 수: {row.first_try_corrects}\n"
                        f"첫 시도 기준 정답률: {row.first_try_accuracy_rate:.1f}%\n"
                        f"전체 제출 기준 정답률: {row.overall_accuracy_rate:.1f}%\n"
                        f"최근 응답: {last_answered_at}"
                    ),
                    inline=False,
                )

            logger.info(
                "Admin stats viewed by user=%s quiz_id=%s rows=%s",
                interaction.user.id,
                quiz_id,
                len(stats_rows),
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)
        finally:
            session.close()
