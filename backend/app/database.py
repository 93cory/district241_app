"""PNPI / PNPI · Configuration de la base de donnees SQLAlchemy."""
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


import logging
import time

_db_logger = logging.getLogger("pnpi.database")


def _create_engine_with_retry(url: str, max_retries: int = 5, delay: float = 2.0):
    """Create engine and verify connection with retries (useful at startup in Docker)."""
    eng = _engine_for(url)

    if url.startswith("sqlite"):
        return eng

    for attempt in range(1, max_retries + 1):
        try:
            with eng.connect() as conn:
                conn.execute(__import__("sqlalchemy").text("SELECT 1"))
            _db_logger.info("Database connected (attempt %d)", attempt)
            return eng
        except Exception as e:
            if attempt == max_retries:
                _db_logger.error("Database connection failed after %d attempts: %s", max_retries, e)
                return eng  # Return engine anyway, let the app handle errors
            _db_logger.warning("Database not ready (attempt %d/%d): %s · retrying in %ss", attempt, max_retries, str(e)[:100], delay)
            time.sleep(delay)
            delay = min(delay * 1.5, 10)

    return eng


engine = _create_engine_with_retry(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
