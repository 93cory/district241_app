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


import os


def _engine_for(url: str):
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    is_sqlite = url.startswith("sqlite")

    pool_kwargs = {}
    if not is_sqlite:
        pool_kwargs = {
            "pool_size": int(os.getenv("PNPI_DB_POOL_SIZE", "10")),
            "max_overflow": int(os.getenv("PNPI_DB_MAX_OVERFLOW", "20")),
            "pool_timeout": int(os.getenv("PNPI_DB_POOL_TIMEOUT", "30")),
            "pool_recycle": int(os.getenv("PNPI_DB_POOL_RECYCLE", "1800")),
            "pool_pre_ping": True,
        }

    return create_engine(url, future=True, connect_args=connect_args, **pool_kwargs)


def get_pool_status() -> dict:
    """Return current connection pool statistics."""
    pool = engine.pool
    return {
        "pool_size": pool.size(),
        "checked_in": pool.checkedin(),
        "checked_out": pool.checkedout(),
        "overflow": pool.overflow(),
        "invalid": pool._invalidate_time if hasattr(pool, "_invalidate_time") else 0,
    }


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
