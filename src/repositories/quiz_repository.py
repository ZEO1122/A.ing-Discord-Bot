from __future__ import annotations

from datetime import datetime, timezone
import json

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from models.briefing import Briefing
from models.quiz import Quiz
from models.quiz import QuizChoice


class QuizRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_latest_open(self) -> Quiz | None:
        statement = (
            select(Quiz)
            .where(Quiz.status == "open")
            .options(selectinload(Quiz.choices))
            .order_by(Quiz.opens_at.desc())
        )
        return self.session.scalar(statement)

    def get_by_id(self, quiz_id: int) -> Quiz | None:
        statement = select(Quiz).where(Quiz.id == quiz_id).options(selectinload(Quiz.choices))
        return self.session.scalar(statement)

    def add(self, quiz: Quiz) -> Quiz:
        self.session.add(quiz)
        self.session.flush()
        return quiz

    def ensure_sample_quiz(self, briefing: Briefing) -> Quiz:
        existing = self.get_latest_open()
        if existing is not None:
            return existing

        quiz = Quiz(
            briefing_id=briefing.id,
            quiz_type="mcq",
            question="Attention 메커니즘의 핵심 장점으로 가장 알맞은 것은?",
            answer_key_json=json.dumps([2]),
            hint="입력 전체 중 중요한 부분에 더 집중하는 능력을 생각해보세요.",
            explanation="Attention은 입력 전체에서 중요한 위치에 더 높은 가중치를 둘 수 있어 장기 의존성 문제 완화에 유리합니다.",
            status="open",
            opens_at=datetime.now(timezone.utc),
        )
        quiz.choices.extend(
            [
                QuizChoice(choice_order=1, choice_text="고정 길이 벡터만 사용한다"),
                QuizChoice(choice_order=2, choice_text="중요한 입력 위치에 더 집중할 수 있다"),
                QuizChoice(choice_order=3, choice_text="항상 CNN보다 빠르다"),
                QuizChoice(choice_order=4, choice_text="정답 키를 공개 메시지에 표시한다"),
            ]
        )
        return self.add(quiz)
