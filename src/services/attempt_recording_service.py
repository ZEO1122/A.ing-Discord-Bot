from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from models.attempt import Attempt
from repositories.attempt_repository import AttemptRepository
from repositories.user_repository import UserRepository
from services.grading_service import GradeResult


class AttemptRecordingService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.attempt_repository = AttemptRepository(session)
        self.user_repository = UserRepository(session)

    def record_attempt(
        self,
        discord_user_id: str,
        display_name: str | None,
        username: str | None,
        quiz_id: int,
        raw_answer: str,
        grade_result: GradeResult,
        attempt_no: int,
        submitted_at: datetime | None = None,
    ) -> Attempt:
        user = self.user_repository.get_by_discord_user_id(discord_user_id)
        if user is None:
            user = self.user_repository.create(discord_user_id, display_name, username)

        attempt = Attempt(
            quiz_id=quiz_id,
            user_id=user.id,
            attempt_no=attempt_no,
            raw_answer=raw_answer,
            normalized_answer=grade_result.normalized_answer,
            is_correct=grade_result.is_correct,
            score=grade_result.score,
            submitted_at=submitted_at,
        )
        self.attempt_repository.add(attempt)
        return attempt
