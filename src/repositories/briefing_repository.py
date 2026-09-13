from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from models.briefing import Briefing, BriefingSource


class BriefingRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_id(self, briefing_id: int) -> Briefing | None:
        statement = (
            select(Briefing)
            .where(Briefing.id == briefing_id)
            .options(selectinload(Briefing.sources))
        )
        return self.session.scalar(statement)

    def get_latest_published(self, track: str) -> Briefing | None:
        statement = (
            select(Briefing)
            .where(Briefing.track == track, Briefing.status == "published")
            .options(selectinload(Briefing.sources))
            .order_by(Briefing.published_at.desc())
        )
        return self.session.scalar(statement)

    def get_latest_ready(self, track: str) -> Briefing | None:
        statement = (
            select(Briefing)
            .where(Briefing.track == track, Briefing.status.in_(["draft", "published"]))
            .options(selectinload(Briefing.sources))
            .order_by(Briefing.created_at.desc())
        )
        return self.session.scalar(statement)

    def get_by_briefing_key(self, briefing_key: str) -> Briefing | None:
        statement = (
            select(Briefing)
            .where(Briefing.briefing_key == briefing_key)
            .options(selectinload(Briefing.sources))
        )
        return self.session.scalar(statement)

    def add(self, briefing: Briefing) -> Briefing:
        self.session.add(briefing)
        self.session.flush()
        return briefing

    def mark_published(self, briefing: Briefing) -> Briefing:
        briefing.status = "published"
        briefing.published_at = datetime.now(timezone.utc)
        self.session.add(briefing)
        self.session.flush()
        return briefing

    def ensure_sample_briefing(self, track: str = "dl-basics") -> Briefing:
        existing = self.get_latest_ready(track)
        if existing is not None:
            return existing

        briefing = Briefing(
            briefing_key=f"{track}-sample-001",
            track=track,
            title="어텐션은 왜 중요한가",
            one_line="어텐션은 입력 전체 중 중요한 부분에 더 집중하도록 돕는 메커니즘이다.",
            what_happened="RNN 기반 모델의 장기 의존성 한계를 줄이기 위해, 입력 토큰 간 관련성을 직접 계산하는 방식이 널리 사용되기 시작했다.",
            why_it_matters="긴 문장이나 복잡한 입력에서도 중요한 정보에 가중치를 둘 수 있어 번역, 요약, 멀티모달 모델의 핵심 기반이 되었다.",
            easy_terms_json='["Attention: 중요한 정보에 집중하는 메커니즘", "Token: 모델이 처리하는 텍스트 조각", "Weight: 중요도를 나타내는 값"]',
            discussion_prompt="Transformer가 CNN이나 RNN보다 유리한 상황은 언제일까?",
            status="draft",
        )
        briefing.sources.append(
            BriefingSource(
                title="Attention Is All You Need",
                url="https://arxiv.org/abs/1706.03762",
                normalized_url="https://arxiv.org/abs/1706.03762",
                source_type="paper",
            )
        )
        return self.add(briefing)
