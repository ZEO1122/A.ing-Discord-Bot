from __future__ import annotations

from services.grading_service import GradeResult


class PrivateFeedbackRenderer:
    def render(self, grade_result: GradeResult, attempt_no: int) -> str:
        status = "정답입니다" if grade_result.is_correct else "오답입니다"
        explanation = grade_result.explanation or "해설은 아직 준비되지 않았습니다."
        return f"{status}\n시도 횟수: {attempt_no}\n점수: {grade_result.score}\n해설: {explanation}"
