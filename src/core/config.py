from __future__ import annotations

from dataclasses import dataclass
import os


@dataclass(slots=True)
class Settings:
    discord_bot_token: str = os.getenv("DISCORD_BOT_TOKEN", "")
    discord_guild_id: str = os.getenv("DISCORD_GUILD_ID", "")
    discord_brief_channel_id: str = os.getenv("DISCORD_BRIEF_CHANNEL_ID", "")
    discord_webhook_url: str = os.getenv("DISCORD_WEBHOOK_URL", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./data/app.db")
    app_env: str = os.getenv("APP_ENV", "development")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    @property
    def is_configured(self) -> bool:
        return bool(self.discord_bot_token)


def get_settings() -> Settings:
    return Settings()
