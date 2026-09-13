from __future__ import annotations

from dataclasses import dataclass

from repositories.attempt_repository import AttemptRepository
from repositories.quiz_repository import QuizRepository
from services.attempt_recording_service import AttemptRecordingService
from services.grading_service import GradingService
from services.private_feedback_renderer import PrivateFeedbackRenderer


class SubmissionError(RuntimeError):
    pass


class QuizNotFoundError(SubmissionError):
    pass


class QuizClosedError(SubmissionError):
    pass


class InvalidChoiceError(SubmissionError):
    pass


@dataclass(slots=True)
class SubmissionResult:
    quiz_id: int
    attempt_id: int
    attempt_no: int
    is_correct: bool
    score: int
    feedback_message: str


class SubmissionHandlerService:
    def __init__(
        self,
        quiz_repository: QuizRepository,
        attempt_repository: AttemptRepository,
        attempt_recording_service: AttemptRecordingService,
        grading_service: GradingService,
        feedback_renderer: PrivateFeedbackRenderer,
    ) -> None:
        self.quiz_repository = quiz_repository
        self.attempt_repository = attempt_repository
        self.attempt_recording_service = attempt_recording_service
        self.grading_service = grading_service
        self.feedback_renderer = feedback_renderer

    def submit_multiple_choice(
        self,
        *,
        discord_user_id: str,
        display_name: str | None,
        username: str | None,
        quiz_id: int,
        selected_choice: int,
    ) -> SubmissionResult:
        quiz = self.quiz_repository.get_by_id(quiz_id)
        if quiz is None:
            raise QuizNotFoundError(f"quiz_id={quiz_id} 에 해당하는 퀴즈가 없습니다.")

        if quiz.status != "open":
            raise QuizClosedError(f"quiz_id={quiz_id} 는 현재 제출할 수 없습니다.")

        valid_choices = {choice.choice_order for choice in quiz.choices}
        if selected_choice not in valid_choices:
            raise InvalidChoiceError(f"choice={selected_choice} 는 유효한 보기 번호가 아닙니다.")

        user = self.attempt_recording_service.user_repository.get_by_discord_user_id(discord_user_id)
        user_id = user.id if user is not None else -1
        attempt_no = 1 if user_id == -1 else self.attempt_repository.next_attempt_no(quiz_id=quiz.id, user_id=user_id)

        grade_result = self.grading_service.grade_multiple_choice(
            quiz=quiz,
            selected_choice=selected_choice,
            attempt_no=attempt_no,
        )
        attempt = self.attempt_recording_service.record_attempt(
            discord_user_id=discord_user_id,
            display_name=display_name,
            username=username,
            quiz_id=quiz.id,
            raw_answer=str(selected_choice),
            grade_result=grade_result,
            attempt_no=attempt_no,
        )
        feedback = self.feedback_renderer.render(grade_result, attempt.attempt_no)
        return SubmissionResult(
            quiz_id=quiz.id,
            attempt_id=attempt.id,
            attempt_no=attempt.attempt_no,
            is_correct=grade_result.is_correct,
            score=grade_result.score,
            feedback_message=feedback,
        )
