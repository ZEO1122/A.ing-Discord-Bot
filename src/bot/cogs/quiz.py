from __future__ import annotations

# pyright: reportMissingImports=false

import discord
from discord import app_commands
from discord.ext import commands

from bot.views.quiz import QuizEntryView
from core.db import get_session
from repositories.attempt_repository import AttemptRepository
from repositories.briefing_repository import BriefingRepository
from repositories.quiz_repository import QuizRepository
from services.attempt_recording_service import AttemptRecordingService
from services.grading_service import GradingService
from services.private_feedback_renderer import PrivateFeedbackRenderer
from services.submission_handler import SubmissionError, SubmissionHandlerService


class QuizCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="quiz_latest", description="가장 최근 열린 퀴즈에 진입합니다.")
    async def quiz_latest(self, interaction: discord.Interaction) -> None:
        if interaction.guild is None:
            await interaction.response.send_message("퀴즈는 서버 안에서만 사용할 수 있습니다.", ephemeral=True)
            return

        session = get_session()
        try:
            briefing_repository = BriefingRepository(session)
            briefing = briefing_repository.ensure_sample_briefing()
            quiz_repository = QuizRepository(session)
            quiz = quiz_repository.ensure_sample_quiz(briefing)
            session.commit()

            embed = discord.Embed(
                title="오늘의 퀴즈",
                description=quiz.question,
                color=discord.Color.green(),
            )
            choices = [(choice.choice_order, choice.choice_text) for choice in quiz.choices]
            for choice_order, choice_text in choices:
                embed.add_field(name=f"선택지 {choice_order}", value=choice_text, inline=False)

            await interaction.response.send_message(
                embed=embed,
                view=QuizEntryView(quiz_id=quiz.id, choices=choices),
                ephemeral=True,
            )
        finally:
            session.close()

    @app_commands.command(name="quiz_solve", description="특정 퀴즈에 답을 제출합니다.")
    async def quiz_solve(
        self,
        interaction: discord.Interaction,
        quiz_id: int,
        choice: int,
    ) -> None:
        if interaction.guild is None:
            await interaction.response.send_message("퀴즈 제출은 서버 안에서만 가능합니다.", ephemeral=True)
            return

        session = get_session()
        try:
            submission_handler = SubmissionHandlerService(
                quiz_repository=QuizRepository(session),
                attempt_repository=AttemptRepository(session),
                attempt_recording_service=AttemptRecordingService(session),
                grading_service=GradingService(),
                feedback_renderer=PrivateFeedbackRenderer(),
            )
            result = submission_handler.submit_multiple_choice(
                discord_user_id=str(interaction.user.id),
                display_name=getattr(interaction.user, "display_name", None),
                username=getattr(interaction.user, "name", None),
                quiz_id=quiz_id,
                selected_choice=choice,
            )
            session.commit()
            await interaction.response.send_message(result.feedback_message, ephemeral=True)
        except SubmissionError as exc:
            session.rollback()
            await interaction.response.send_message(str(exc), ephemeral=True)
        finally:
            session.close()
