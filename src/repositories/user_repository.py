from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from models.user import User


class UserRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_discord_user_id(self, discord_user_id: str) -> User | None:
        statement = select(User).where(User.discord_user_id == discord_user_id)
        return self.session.scalar(statement)

    def create(self, discord_user_id: str, display_name: str | None, username: str | None) -> User:
        user = User(discord_user_id=discord_user_id, display_name=display_name, username=username)
        self.session.add(user)
        self.session.flush()
        return user
