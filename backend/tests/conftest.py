import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.booking import models  # noqa: F401 — register models


TEST_DB_URL = "postgresql+psycopg://postgres:dev@localhost:5432/booking_test"


@pytest.fixture(scope="session")
def engine():
    """Create a fresh test database schema once per test session."""
    # Connect to default db to create/drop the test db
    admin_url = "postgresql+psycopg://postgres:dev@localhost:5432/postgres"
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        conn.execute(text("DROP DATABASE IF EXISTS booking_test"))
        conn.execute(text("CREATE DATABASE booking_test"))
    admin_engine.dispose()

    engine = create_engine(TEST_DB_URL, future=True)

    # Enable btree_gist before creating tables (ExcludeConstraint needs it)
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS btree_gist"))

    Base.metadata.create_all(engine)

    yield engine

    engine.dispose()


@pytest.fixture
def session(engine):
    """Provide a transactional session that rolls back after each test."""
    connection = engine.connect()
    transaction = connection.begin()
    SessionLocal = sessionmaker(bind=connection, autoflush=False, autocommit=False)
    session = SessionLocal()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def resource(session):
    """A sample resource for tests to book against."""
    r = models.Resource(
        name="Consultation Room A",
        capacity=1,
        duration_minutes=30,
    )
    session.add(r)
    session.flush()  # assigns ID without committing
    return r