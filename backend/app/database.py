"""PNPI / PNPI — Configuration de la base de donnees SQLAlchemy."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Generator, Optional

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _engine_for(url: str):
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    is_sqlite = url.startswith("sqlite")

    pool_kwargs = {}
    if not is_sqlite:
        pool_kwargs = {
            "pool_size": 10,
            "max_overflow": 20,
            "pool_timeout": 30,
            "pool_recycle": 1800,  # Recycle connections every 30 min
            "pool_pre_ping": True,  # Verify connection is alive before using
        }

    return create_engine(url, future=True, connect_args=connect_args, **pool_kwargs)


engine = _engine_for(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
