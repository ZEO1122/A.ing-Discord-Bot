from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from models.publish_log import PublishLog


class PublishLogRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, log: PublishLog) -> PublishLog:
        self.session.add(log)
        self.session.flush()
        return log

    def get_latest_for_briefing(self, briefing_id: int) -> PublishLog | None:
        statement = (
            select(PublishLog)
            .where(PublishLog.briefing_id == briefing_id)
            .order_by(PublishLog.created_at.desc())
        )
        return self.session.scalar(statement)
