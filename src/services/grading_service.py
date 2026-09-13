from __future__ import annotations

from dataclasses import dataclass
import json

from models.quiz import Quiz


@dataclass(slots=True)
class GradeResult:
    normalized_answer: str
    is_correct: bool
    score: int
    explanation: str | None


class GradingService:
    def grade_multiple_choice(self, quiz: Quiz, selected_choice: int, attempt_no: int) -> GradeResult:
        answer_key = json.loads(quiz.answer_key_json)
        normalized_answer = str(selected_choice)
        is_correct = selected_choice in answer_key
        score = 10 if is_correct and attempt_no == 1 else 4 if is_correct else 1
        return GradeResult(
            normalized_answer=normalized_answer,
            is_correct=is_correct,
            score=score,
            explanation=quiz.explanation,
        )
