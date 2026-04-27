"""Shared pytest fixtures for the ic-method backend test suite."""
import os
import pytest_asyncio

os.environ.setdefault("JWT_SECRET", "test-secret-key")
os.environ.setdefault("MAIL_USERNAME", "test@example.com")
os.environ.setdefault("MAIL_PASSWORD", "testpassword")
os.environ.setdefault("MAIL_FROM", "test@example.com")
os.environ.setdefault("MAIL_SERVER", "smtp.example.com")

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool
from app.models.models import Base

DATABASE_URL = "sqlite+aiosqlite:///:memory:"


def _enable_fk(dbapi_conn, _record):
    """Enable SQLite FK constraints to match PostgreSQL ON DELETE CASCADE/SET NULL."""
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


@pytest_asyncio.fixture(scope="function")
async def db() -> AsyncSession:
    """Provide a fresh async SQLite session per test with FK constraints enabled."""
    engine = create_async_engine(
        DATABASE_URL,
        # StaticPool reuses the same underlying connection so the PRAGMA stays set
        # and the in-memory database is shared across all operations in this fixture.
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    event.listen(engine.sync_engine, "connect", _enable_fk)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()
