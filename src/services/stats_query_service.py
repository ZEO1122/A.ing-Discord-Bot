from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal

from repositories.attempt_repository import AttemptRepository


Period = Literal["today", "week", "month"]


@dataclass(slots=True)
class QuizStats:
    quiz_id: int
    participants: int
    total_attempts: int
    correct_attempts: int
    first_attempts: int
    first_try_corrects: int
    first_try_accuracy_rate: float
    overall_accuracy_rate: float


@dataclass(slots=True)
class OverallStats:
    participants: int
    total_attempts: int
    correct_attempts: int
    first_attempts: int
    first_try_corrects: int
    first_try_accuracy_rate: float
    overall_accuracy_rate: float


@dataclass(slots=True)
class UserAttemptStats:
    user_id: int
    discord_user_id: str
    display_name: str | None
    total_attempts: int
    correct_attempts: int
    first_attempts: int
    first_try_corrects: int
    first_try_accuracy_rate: float
    overall_accuracy_rate: float
    last_answered_at: datetime | None


class StatsQueryService:
    def __init__(self, attempt_repository: AttemptRepository) -> None:
        self.attempt_repository = attempt_repository

    def get_period_start(self, period: Period | None, now: datetime | None = None) -> datetime | None:
        if period is None:
            return None

        current = now or datetime.now(timezone.utc)
        if period == "today":
            return current.replace(hour=0, minute=0, second=0, microsecond=0)
        if period == "week":
            return current - timedelta(days=7)
        if period == "month":
            return current - timedelta(days=30)
        raise ValueError(f"Unsupported period: {period}")

    def get_quiz_stats(self, quiz_id: int, period: Period | None = None) -> QuizStats | None:
        rows = self.attempt_repository.get_user_attempt_stats(
            quiz_id=quiz_id,
            submitted_after=self.get_period_start(period),
        )
        if not rows:
            return None

        total_attempts = sum(row.total_attempts for row in rows)
        correct_attempts = sum(row.correct_attempts for row in rows)
        first_attempts = sum(row.first_attempts for row in rows)

        return QuizStats(
            quiz_id=quiz_id,
            participants=len({row.user_id for row in rows}),
            total_attempts=total_attempts,
            correct_attempts=correct_attempts,
            first_attempts=first_attempts,
            first_try_corrects=sum(row.first_try_corrects for row in rows),
            first_try_accuracy_rate=0.0 if first_attempts == 0 else sum(row.first_try_corrects for row in rows) * 100.0 / first_attempts,
            overall_accuracy_rate=0.0 if total_attempts == 0 else correct_attempts * 100.0 / total_attempts,
        )

    def get_overall_stats(self, quiz_id: int | None = None, period: Period | None = None) -> OverallStats | None:
        rows = self.attempt_repository.get_user_attempt_stats(
            quiz_id=quiz_id,
            submitted_after=self.get_period_start(period),
        )
        if not rows:
            return None

        total_attempts = sum(row.total_attempts for row in rows)
        correct_attempts = sum(row.correct_attempts for row in rows)
        first_attempts = sum(row.first_attempts for row in rows)
        return OverallStats(
            participants=len({row.user_id for row in rows}),
            total_attempts=total_attempts,
            correct_attempts=correct_attempts,
            first_attempts=first_attempts,
            first_try_corrects=sum(row.first_try_corrects for row in rows),
            first_try_accuracy_rate=0.0 if first_attempts == 0 else sum(row.first_try_corrects for row in rows) * 100.0 / first_attempts,
            overall_accuracy_rate=0.0 if total_attempts == 0 else correct_attempts * 100.0 / total_attempts,
        )

    def get_user_attempt_stats(self, quiz_id: int | None = None, period: Period | None = None) -> list[UserAttemptStats]:
        rows = self.attempt_repository.get_user_attempt_stats(
            quiz_id=quiz_id,
            submitted_after=self.get_period_start(period),
        )
        return [
            UserAttemptStats(
                user_id=row.user_id,
                discord_user_id=row.discord_user_id,
                display_name=row.display_name,
                total_attempts=row.total_attempts,
                correct_attempts=row.correct_attempts,
                first_attempts=row.first_attempts,
                first_try_corrects=row.first_try_corrects,
                first_try_accuracy_rate=0.0 if row.first_attempts == 0 else row.first_try_corrects * 100.0 / row.first_attempts,
                overall_accuracy_rate=0.0 if row.total_attempts == 0 else row.correct_attempts * 100.0 / row.total_attempts,
                last_answered_at=row.last_answered_at,
            )
            for row in rows
        ]

    def get_user_stats(
        self,
        discord_user_id: str,
        quiz_id: int | None = None,
        period: Period | None = None,
    ) -> UserAttemptStats | None:
        rows = self.attempt_repository.get_user_attempt_stats(
            quiz_id=quiz_id,
            discord_user_id=discord_user_id,
            submitted_after=self.get_period_start(period),
        )
        if not rows:
            return None

        row = rows[0]
        return UserAttemptStats(
            user_id=row.user_id,
            discord_user_id=row.discord_user_id,
            display_name=row.display_name,
            total_attempts=row.total_attempts,
            correct_attempts=row.correct_attempts,
            first_attempts=row.first_attempts,
            first_try_corrects=row.first_try_corrects,
            first_try_accuracy_rate=0.0 if row.first_attempts == 0 else row.first_try_corrects * 100.0 / row.first_attempts,
            overall_accuracy_rate=0.0 if row.total_attempts == 0 else row.correct_attempts * 100.0 / row.total_attempts,
            last_answered_at=row.last_answered_at,
        )
