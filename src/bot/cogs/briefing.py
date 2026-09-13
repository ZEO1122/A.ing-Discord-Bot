from __future__ import annotations

# pyright: reportMissingImports=false

import discord
from discord import app_commands
from discord.ext import commands

from core.db import get_session
from repositories.briefing_repository import BriefingRepository
from repositories.publish_log_repository import PublishLogRepository
from services.publish_service import PublishFlowError, PublishService


class BriefingCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="brief_today", description="오늘의 브리핑을 조회합니다.")
    async def brief_today(self, interaction: discord.Interaction) -> None:
        session = get_session()
        try:
            service = PublishService(BriefingRepository(session), PublishLogRepository(session))
            briefing, payload = service.get_latest_briefing_payload(track="dl-basics")
        except PublishFlowError as exc:
            await interaction.response.send_message(str(exc), ephemeral=True)
            return
        finally:
            session.close()

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
        embed.set_footer(text=f"briefing_key={briefing.briefing_key}")
        await interaction.response.send_message(embed=embed, ephemeral=False)
