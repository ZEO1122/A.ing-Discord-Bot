from __future__ import annotations

# pyright: reportMissingImports=false

import discord
from discord import app_commands
from discord.ext import commands
from datetime import datetime
from typing import Literal, cast

from core.db import get_session
from repositories.attempt_repository import AttemptRepository
from services.stats_query_service import Period, StatsQueryService


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


class StatsCog(commands.GroupCog, group_name="stats", group_description="사용자 통계 명령"):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="me", description="내 퀴즈 통계를 조회합니다.")
    @app_commands.describe(period="today/week/month 중 하나")
    @app_commands.choices(
        period=[
            app_commands.Choice(name="today", value="today"),
            app_commands.Choice(name="week", value="week"),
            app_commands.Choice(name="month", value="month"),
        ]
    )
    async def me(
        self,
        interaction: discord.Interaction,
        quiz_id: int | None = None,
        period: Literal["today", "week", "month"] | None = None,
    ) -> None:
        if interaction.guild is None:
            await interaction.response.send_message("통계 조회는 서버 안에서만 사용할 수 있습니다.", ephemeral=True)
            return

        session = get_session()
        try:
            stats_service = StatsQueryService(AttemptRepository(session))
            period_filter = cast(Period | None, period)
            stats = stats_service.get_user_stats(
                discord_user_id=str(interaction.user.id),
                quiz_id=quiz_id,
                period=period_filter,
            )
            if stats is None:
                await interaction.response.send_message("아직 기록된 응답이 없습니다.", ephemeral=True)
                return

            display_name = stats.display_name or stats.discord_user_id
            last_answered_at = _format_timestamp(stats.last_answered_at)

            title = _format_stats_title(f"{display_name}의 학습 통계", quiz_id, period)

            embed = discord.Embed(title=title, color=discord.Color.blurple())
            embed.description = (
                "[내 통계]\n"
                f"총 응답 수: {stats.total_attempts}\n"
                f"총 정답 수: {stats.correct_attempts}\n"
                f"첫 제출 수: {stats.first_attempts}\n"
                f"첫 시도 정답 수: {stats.first_try_corrects}\n"
                f"첫 시도 기준 정답률: {stats.first_try_accuracy_rate:.1f}%\n"
                f"전체 제출 기준 정답률: {stats.overall_accuracy_rate:.1f}%\n"
                f"최근 응답: {last_answered_at}"
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)
        finally:
            session.close()
