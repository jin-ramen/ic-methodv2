"""Tests for app.services.method."""
import os
os.environ.setdefault("JWT_SECRET", "test-secret-key")
os.environ.setdefault("MAIL_USERNAME", "test@example.com")
os.environ.setdefault("MAIL_PASSWORD", "testpassword")
os.environ.setdefault("MAIL_FROM", "test@example.com")
os.environ.setdefault("MAIL_SERVER", "smtp.example.com")

import uuid
import pytest
from decimal import Decimal

from app.services.method import create_method, list_methods, update_method, delete_method


@pytest.mark.asyncio
async def test_create_method(db):
    m = await create_method(db, name="Yoga", price=50.00, description="Beginner yoga")
    assert m.id is not None
    assert m.name == "Yoga"
    assert float(m.price) == 50.00


@pytest.mark.asyncio
async def test_create_method_no_description(db):
    m = await create_method(db, name="Pilates", price=60.00, description=None)
    assert m.description is None


@pytest.mark.asyncio
async def test_list_methods_empty(db):
    result = await list_methods(db)
    assert result == []


@pytest.mark.asyncio
async def test_list_methods_returns_all(db):
    await create_method(db, name="Yoga", price=50.00, description=None)
    await create_method(db, name="Pilates", price=60.00, description=None)
    result = await list_methods(db)
    assert len(result) == 2


@pytest.mark.asyncio
async def test_list_methods_ordered_by_name(db):
    await create_method(db, name="Zumba", price=40.00, description=None)
    await create_method(db, name="Aerobics", price=35.00, description=None)
    await create_method(db, name="Pilates", price=60.00, description=None)
    result = await list_methods(db)
    names = [m.name for m in result]
    assert names == sorted(names)


@pytest.mark.asyncio
async def test_update_method_name(db):
    m = await create_method(db, name="Old Name", price=50.00, description=None)
    updated = await update_method(db, m.id, name="New Name", price=None, description=None)
    assert updated.name == "New Name"


@pytest.mark.asyncio
async def test_update_method_price(db):
    m = await create_method(db, name="Yoga", price=50.00, description=None)
    updated = await update_method(db, m.id, name=None, price=75.00, description=None)
    assert float(updated.price) == 75.00


@pytest.mark.asyncio
async def test_update_method_description(db):
    m = await create_method(db, name="Yoga", price=50.00, description="Original")
    updated = await update_method(db, m.id, name=None, price=None, description="Updated desc")
    assert updated.description == "Updated desc"


@pytest.mark.asyncio
async def test_update_method_no_changes_returns_existing(db):
    m = await create_method(db, name="Yoga", price=50.00, description="desc")
    updated = await update_method(db, m.id, name=None, price=None, description=None)
    assert updated.id == m.id
    assert updated.name == "Yoga"


@pytest.mark.asyncio
async def test_update_method_nonexistent_returns_none(db):
    result = await update_method(db, uuid.uuid4(), name="X", price=None, description=None)
    assert result is None


@pytest.mark.asyncio
async def test_delete_method(db):
    m = await create_method(db, name="Delete Me", price=10.00, description=None)
    deleted = await delete_method(db, m.id)
    assert deleted is True


@pytest.mark.asyncio
async def test_delete_method_nonexistent(db):
    deleted = await delete_method(db, uuid.uuid4())
    assert deleted is False


@pytest.mark.asyncio
async def test_delete_method_removed_from_list(db):
    m = await create_method(db, name="Remove", price=10.00, description=None)
    await delete_method(db, m.id)
    result = await list_methods(db)
    assert all(x.id != m.id for x in result)


@pytest.mark.asyncio
async def test_update_method_description_cannot_be_cleared_to_none(db):
    """Passing description=None does NOT clear an existing description — known limitation of
    the `if v is not None` filter in update_method."""
    m = await create_method(db, name="Yoga", price=50.00, description="Existing description")
    updated = await update_method(db, m.id, name=None, price=None, description=None)
    # Description should be unchanged because None is filtered out
    assert updated.description == "Existing description"


@pytest.mark.asyncio
async def test_create_method_with_session(db):
    """Sessions can reference a method; deleting the method sets method_id to NULL."""
    from app.services.session import creater_session, list_sessions
    from datetime import datetime, timezone, timedelta

    m = await create_method(db, name="Flow", price=55.00, description=None)
    s = await creater_session(
        db,
        method_id=m.id,
        start_time=datetime.now(timezone.utc) + timedelta(hours=1),
        end_time=datetime.now(timezone.utc) + timedelta(hours=2),
        capacity=5,
        instructor=None,
    )
    assert s.method_id == m.id
    await delete_method(db, m.id)

    # Expire identity map so the next query reloads from DB (needed with expire_on_commit=False)
    db.expire_all()
    rows = await list_sessions(db)
    session_obj, _ = rows[0]
    assert session_obj.method_id is None
