from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands
import logging

from bot.cogs.admin import AdminCog
from bot.cogs.briefing import BriefingCog
from bot.cogs.quiz import QuizCog
from bot.cogs.stats import StatsCog
from core.config import get_settings


logger = logging.getLogger(__name__)


class StudyBot(commands.Bot):
    def __init__(self) -> None:
        self.settings = get_settings()
        intents = discord.Intents.default()
        super().__init__(command_prefix="!", intents=intents)

    async def setup_hook(self) -> None:
        logger.info("Setting up bot cogs and syncing commands")
        await self.add_cog(BriefingCog(self))
        await self.add_cog(QuizCog(self))
        await self.add_cog(StatsCog(self))
        await self.add_cog(AdminCog(self))

        if self.settings.discord_guild_id:
            guild = discord.Object(id=int(self.settings.discord_guild_id))
            self.tree.copy_global_to(guild=guild)
            await self.tree.sync(guild=guild)
            logger.info("Synced commands to guild_id=%s", self.settings.discord_guild_id)
        else:
            await self.tree.sync()
            logger.info("Synced global commands")

    async def on_ready(self) -> None:
        logger.info("Bot ready user=%s id=%s", self.user, getattr(self.user, "id", None))

    async def on_app_command_error(
        self,
        interaction: discord.Interaction,
        error: app_commands.AppCommandError,
    ) -> None:
        logger.exception(
            "App command error command=%s user_id=%s guild_id=%s channel_id=%s",
            getattr(getattr(interaction, "command", None), "qualified_name", None),
            getattr(interaction.user, "id", None),
            getattr(interaction.guild, "id", None),
            getattr(interaction, "channel_id", None),
            exc_info=error,
        )
        message = "명령 처리 중 오류가 발생했습니다."
        if isinstance(error, app_commands.MissingPermissions):
            message = "관리자 권한이 필요합니다."
        elif isinstance(error, app_commands.CheckFailure):
            message = "이 명령을 실행할 수 있는 권한이 없습니다."

        if interaction.response.is_done():
            await interaction.followup.send(message, ephemeral=True)
        else:
            await interaction.response.send_message(message, ephemeral=True)


def main() -> None:
    settings = get_settings()
    logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
    bot = StudyBot()
    if not settings.discord_bot_token:
        raise RuntimeError("DISCORD_BOT_TOKEN is required to run the bot.")
    bot.run(settings.discord_bot_token)


if __name__ == "__main__":
    main()
