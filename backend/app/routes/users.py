import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.db.session import get_db
from app.models.models import User, UserRole
from app.schemas.user import UserCreate, UserUpdate, UserSelfUpdate, EmailChangeRequest, PasswordChange, UserRead, UserLogin
from app.services.user import create_user, list_users, update_user, delete_user, auth_user
from app.core.security import verify_access_token
from app.core.config import settings
from app.core.email import send_email_verification_email

router = APIRouter(prefix="/api", tags=["user"])

_bearer = HTTPBearer()


async def _get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = verify_access_token(credentials.credentials)
        user_id = UUID(payload["sub"])
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user


@router.get("/users/check")
async def api_check_user(email: str | None = None, phone: str | None = None, db: AsyncSession = Depends(get_db)):
    conditions = []
    if email:
        conditions.append(User.email == email)
    if phone:
        conditions.append(User.phone == phone)
    if not conditions:
        return {"email_taken": False, "phone_taken": False}

    result = await db.execute(select(User.email, User.phone).where(or_(*conditions)))
    rows = result.all()
    return {
        "email_taken": bool(email) and any(r.email == email for r in rows),
        "phone_taken": bool(phone) and any(r.phone == phone for r in rows),
    }

@router.get("/me", response_model=UserRead)
async def api_me(user: User = Depends(_get_current_user)):
    return user


@router.patch("/me", response_model=UserRead)
async def api_update_me(
    user_in: UserSelfUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    updated = await update_user(
        db, id=current_user.id,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        email=None,
        phone=user_in.phone,
        role=None,
    )
    return updated


@router.post("/me/email/request-change", status_code=status.HTTP_204_NO_CONTENT)
async def api_request_email_change(
    data: EmailChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    if data.new_email == current_user.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That is already your current email.")
    existing = await db.execute(select(User).where(User.email == data.new_email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This email is already in use.")

    token = secrets.token_urlsafe(32)
    current_user.email_pending = data.new_email
    current_user.email_token = token
    current_user.email_token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    await db.commit()

    verify_url = f"{settings.app_url}/api/me/email/verify?token={token}"
    await send_email_verification_email(
        to_email=data.new_email,
        first_name=current_user.first_name,
        verify_url=verify_url,
    )


@router.get("/me/email/verify")
async def api_verify_email(token: str, db: AsyncSession = Depends(get_db)):
    frontend = settings.frontend_url
    result = await db.execute(select(User).where(User.email_token == token))
    user = result.scalar_one_or_none()

    if not user or not user.email_pending:
        return RedirectResponse(f"{frontend}/account/profile?email_error=invalid")
    if user.email_token_expires is None or datetime.now(timezone.utc) > user.email_token_expires:
        return RedirectResponse(f"{frontend}/account/profile?email_error=expired")

    taken = await db.execute(select(User).where(User.email == user.email_pending, User.id != user.id))
    if taken.scalar_one_or_none():
        return RedirectResponse(f"{frontend}/account/profile?email_error=taken")

    user.email = user.email_pending
    user.email_pending = None
    user.email_token = None
    user.email_token_expires = None
    await db.commit()
    return RedirectResponse(f"{frontend}/account/profile?email_verified=1")


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def api_change_password(
    data: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    from app.core.security import verify_password, hash_password
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
    current_user.hashed_password = hash_password(data.new_password)
    await db.commit()


@router.post("/login", status_code=status.HTTP_200_OK)
async def api_auth_user(login_data: UserLogin, db: AsyncSession = Depends(get_db)): 
    return await auth_user(db, login_data)

@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def api_create_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    return await create_user(db=db, user_in=user_in)

@router.get("/users", response_model=list[UserRead])
async def api_list_users(id: UUID | None = None, search: str | None = None, role: str | None = None, db: AsyncSession = Depends(get_db)):
    return await list_users(db=db, id=id, search=search, role=role)

async def _require_admin(user: User = Depends(_get_current_user)) -> User:
    if user.role not in (UserRole.STAFF, UserRole.OWNER):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return user


async def _require_owner(user: User = Depends(_get_current_user)) -> User:
    if user.role != UserRole.OWNER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner access required.")
    return user


@router.post("/admin/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def api_create_staff_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    return await create_user(db=db, user_in=user_in)


@router.patch("/admin/users/{user_id}", response_model=UserRead)
async def api_admin_update_user(
    user_id: UUID,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_owner),
):
    if user_in.role is not None and user_in.role.lower() == 'owner':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot promote to owner.")
    if user_in.role is not None and str(user_id) == str(admin.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change your own role.")
    updated = await update_user(db, id=user_id, first_name=user_in.first_name, last_name=user_in.last_name, email=user_in.email, phone=user_in.phone, role=user_in.role)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated


@router.delete("/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def api_admin_delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    if str(user_id) == str(admin.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account.")
    if not await delete_user(db, id=user_id):
        raise HTTPException(status_code=404, detail="User not found")


@router.patch("/users/{user_id}", response_model=UserRead)
async def api_update_user(user_id: UUID, user_in: UserUpdate, db: AsyncSession = Depends(get_db)):
    updated_user = await update_user(
        db, 
        id=user_id,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        email=user_in.email,
        phone=user_in.phone,
        role=user_in.role
    )
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def api_delete_user(user_id: UUID, db: AsyncSession = Depends(get_db)):
    success = await delete_user(db, id=user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return None
