from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from models.attempt import Attempt
from models.user import User


@dataclass(slots=True)
class UserAttemptStatsRow:
    user_id: int
    discord_user_id: str
    display_name: str | None
    total_attempts: int
    correct_attempts: int
    first_attempts: int
    first_try_corrects: int
    last_answered_at: datetime | None


class AttemptRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def next_attempt_no(self, quiz_id: int, user_id: int) -> int:
        statement = select(func.max(Attempt.attempt_no)).where(
            Attempt.quiz_id == quiz_id,
            Attempt.user_id == user_id,
        )
        current = self.session.scalar(statement)
        return 1 if current is None else int(current) + 1

    def add(self, attempt: Attempt) -> Attempt:
        self.session.add(attempt)
        self.session.flush()
        return attempt

    def get_user_attempt_stats(
        self,
        quiz_id: int | None = None,
        discord_user_id: str | None = None,
        submitted_after: datetime | None = None,
    ) -> list[UserAttemptStatsRow]:
        statement = (
            select(
                User.id,
                User.discord_user_id,
                User.display_name,
                func.count(Attempt.id),
                func.sum(case((Attempt.is_correct.is_(True), 1), else_=0)),
                func.sum(case((Attempt.attempt_no == 1, 1), else_=0)),
                func.sum(
                    case(
                        ((Attempt.is_correct.is_(True)) & (Attempt.attempt_no == 1), 1),
                        else_=0,
                    )
                ),
                func.max(Attempt.submitted_at),
            )
            .join(User, User.id == Attempt.user_id)
            .group_by(User.id, User.discord_user_id, User.display_name)
            .order_by(func.count(Attempt.id).desc(), func.max(Attempt.submitted_at).desc())
        )
        if quiz_id is not None:
            statement = statement.where(Attempt.quiz_id == quiz_id)
        if discord_user_id is not None:
            statement = statement.where(User.discord_user_id == discord_user_id)
        if submitted_after is not None:
            statement = statement.where(Attempt.submitted_at >= submitted_after)

        rows = self.session.execute(statement).all()
        return [
            UserAttemptStatsRow(
                user_id=int(row[0]),
                discord_user_id=str(row[1]),
                display_name=row[2],
                total_attempts=int(row[3]),
                correct_attempts=int(row[4] or 0),
                first_attempts=int(row[5] or 0),
                first_try_corrects=int(row[6] or 0),
                last_answered_at=row[7],
            )
            for row in rows
        ]
