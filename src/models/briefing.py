from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base


class Briefing(Base):
    __tablename__ = "briefings"

    id: Mapped[int] = mapped_column(primary_key=True)
    briefing_key: Mapped[str] = mapped_column(String, unique=True, index=True)
    track: Mapped[str] = mapped_column(String, index=True)
    title: Mapped[str] = mapped_column(String)
    one_line: Mapped[str] = mapped_column(Text)
    what_happened: Mapped[str] = mapped_column(Text)
    why_it_matters: Mapped[str] = mapped_column(Text)
    easy_terms_json: Mapped[str] = mapped_column(Text)
    discussion_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, default="draft")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    sources: Mapped[list[BriefingSource]] = relationship(back_populates="briefing", cascade="all, delete-orphan")


class BriefingSource(Base):
    __tablename__ = "briefing_sources"

    id: Mapped[int] = mapped_column(primary_key=True)
    briefing_id: Mapped[int] = mapped_column(ForeignKey("briefings.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String)
    url: Mapped[str] = mapped_column(Text)
    normalized_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_type: Mapped[str | None] = mapped_column(String, nullable=True)
    published_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    briefing: Mapped[Briefing] = relationship(back_populates="sources")
