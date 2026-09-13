from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from core.config import get_settings
from models.base import Base


def create_engine_from_settings() -> Engine:
    settings = get_settings()
    return create_engine(settings.database_url, future=True)


ENGINE = create_engine_from_settings()
SessionLocal = sessionmaker(bind=ENGINE, autoflush=False, autocommit=False, future=True)


def get_session() -> Session:
    return SessionLocal()


def create_all_tables() -> None:
    Base.metadata.create_all(bind=ENGINE)
