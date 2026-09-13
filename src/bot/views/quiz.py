from __future__ import annotations

# pyright: reportMissingImports=false

import discord

from core.db import get_session
from repositories.attempt_repository import AttemptRepository
from repositories.quiz_repository import QuizRepository
from services.attempt_recording_service import AttemptRecordingService
from services.grading_service import GradingService
from services.private_feedback_renderer import PrivateFeedbackRenderer
from services.submission_handler import SubmissionError, SubmissionHandlerService


class QuizChoiceButton(discord.ui.Button["QuizEntryView"]):
    def __init__(self, choice_order: int, choice_text: str) -> None:
        super().__init__(label=f"{choice_order}. {choice_text}", style=discord.ButtonStyle.primary)
        self.choice_order = choice_order

    async def callback(self, interaction: discord.Interaction) -> None:
        assert self.view is not None
        await self.view.submit_choice(interaction, self.choice_order)


class QuizEntryView(discord.ui.View):
    def __init__(self, quiz_id: int, choices: list[tuple[int, str]]) -> None:
        super().__init__(timeout=300)
        self.quiz_id = quiz_id
        for choice_order, choice_text in choices:
            self.add_item(QuizChoiceButton(choice_order, choice_text))

    async def submit_choice(self, interaction: discord.Interaction, selected_choice: int) -> None:
        if interaction.guild is None:
            await interaction.response.send_message("퀴즈 제출은 서버 안에서만 가능합니다.", ephemeral=True)
            return

        session = get_session()
        try:
            quiz_repository = QuizRepository(session)
            attempt_repository = AttemptRepository(session)
            attempt_recording_service = AttemptRecordingService(session)
            submission_handler = SubmissionHandlerService(
                quiz_repository=quiz_repository,
                attempt_repository=attempt_repository,
                attempt_recording_service=attempt_recording_service,
                grading_service=GradingService(),
                feedback_renderer=PrivateFeedbackRenderer(),
            )
            result = submission_handler.submit_multiple_choice(
                discord_user_id=str(interaction.user.id),
                display_name=getattr(interaction.user, "display_name", None),
                username=getattr(interaction.user, "name", None),
                quiz_id=self.quiz_id,
                selected_choice=selected_choice,
            )
            session.commit()
            await interaction.response.send_message(result.feedback_message, ephemeral=True)
        except SubmissionError as exc:
            session.rollback()
            await interaction.response.send_message(str(exc), ephemeral=True)
        except Exception as exc:
            session.rollback()
            await interaction.response.send_message(f"예상치 못한 오류가 발생했습니다: {exc}", ephemeral=True)
        finally:
            session.close()
