"""Tests for app.services.user."""
import os
os.environ.setdefault("JWT_SECRET", "test-secret-key")
os.environ.setdefault("MAIL_USERNAME", "test@example.com")
os.environ.setdefault("MAIL_PASSWORD", "testpassword")
os.environ.setdefault("MAIL_FROM", "test@example.com")
os.environ.setdefault("MAIL_SERVER", "smtp.example.com")

import uuid
import pytest
from fastapi import HTTPException

from app.services.user import create_user, list_users, update_user, delete_user
from app.schemas.user import UserCreate, UserLogin
from app.models.models import UserRole


VALID_PHONE_1 = "+12025550100"
VALID_PHONE_2 = "+12025550101"


def _user_create(email="test@example.com", phone=None) -> UserCreate:
    return UserCreate(
        first_name="Test",
        last_name="User",
        email=email,
        password="password123",
        phone=phone,
    )


@pytest.mark.asyncio
async def test_create_user_success(db):
    user = await create_user(db, _user_create())
    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.hashed_password != "password123"


@pytest.mark.asyncio
async def test_create_user_default_role(db):
    user = await create_user(db, _user_create())
    assert user.role == UserRole.MEMBER


@pytest.mark.asyncio
async def test_create_user_duplicate_email_raises(db):
    await create_user(db, _user_create(email="dup@example.com"))
    with pytest.raises(HTTPException) as exc_info:
        await create_user(db, _user_create(email="dup@example.com"))
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_create_user_duplicate_phone_raises(db):
    await create_user(db, _user_create(email="a@example.com", phone=VALID_PHONE_1))
    with pytest.raises(HTTPException) as exc_info:
        await create_user(db, _user_create(email="b@example.com", phone=VALID_PHONE_1))
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_list_users_empty(db):
    result = await list_users(db)
    assert result == []


@pytest.mark.asyncio
async def test_list_users_returns_all(db):
    await create_user(db, _user_create(email="a@example.com"))
    await create_user(db, _user_create(email="b@example.com"))
    result = await list_users(db)
    assert len(result) == 2


@pytest.mark.asyncio
async def test_list_users_by_id(db):
    user = await create_user(db, _user_create(email="find@example.com"))
    result = await list_users(db, id=user.id)
    assert len(result) == 1
    assert result[0].id == user.id


@pytest.mark.asyncio
async def test_list_users_search_by_email(db):
    await create_user(db, _user_create(email="alice@example.com"))
    await create_user(db, _user_create(email="bob@example.com"))
    result = await list_users(db, search="alice")
    assert len(result) == 1
    assert result[0].email == "alice@example.com"


@pytest.mark.asyncio
async def test_list_users_search_by_name(db):
    u = UserCreate(first_name="Zara", last_name="Smith", email="zara@example.com", password="pass")
    await create_user(db, u)
    await create_user(db, _user_create(email="other@example.com"))
    result = await list_users(db, search="zara")
    assert len(result) == 1
    assert result[0].first_name == "Zara"


@pytest.mark.asyncio
async def test_list_users_filter_by_role(db):
    await create_user(db, _user_create(email="member@example.com"))
    result = await list_users(db, role="member")
    assert all(u.role == UserRole.MEMBER for u in result)


@pytest.mark.asyncio
async def test_update_user_fields(db):
    user = await create_user(db, _user_create(email="upd@example.com"))
    updated = await update_user(db, user.id, first_name="NewName", last_name=None, email=None, phone=None, role=None)
    assert updated.first_name == "NewName"


@pytest.mark.asyncio
async def test_update_user_email(db):
    user = await create_user(db, _user_create(email="old@example.com"))
    updated = await update_user(db, user.id, first_name=None, last_name=None, email="new@example.com", phone=None, role=None)
    assert updated.email == "new@example.com"


@pytest.mark.asyncio
async def test_delete_user(db):
    user = await create_user(db, _user_create(email="del@example.com"))
    deleted = await delete_user(db, user.id)
    assert deleted is True


@pytest.mark.asyncio
async def test_delete_user_nonexistent(db):
    deleted = await delete_user(db, uuid.uuid4())
    assert deleted is False


@pytest.mark.asyncio
async def test_list_users_ordered_by_last_name(db):
    await create_user(db, UserCreate(first_name="Z", last_name="Zebra", email="z@example.com", password="pass"))
    await create_user(db, UserCreate(first_name="A", last_name="Apple", email="a@example.com", password="pass"))
    result = await list_users(db)
    last_names = [u.last_name for u in result]
    assert last_names == sorted(last_names)
