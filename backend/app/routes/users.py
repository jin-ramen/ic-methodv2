from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.db.session import get_db
from app.models.models import User
from app.schemas.user import UserCreate, UserUpdate, UserRead, UserLogin
from app.services.user import create_user, list_users, update_user, delete_user, auth_user

router = APIRouter(prefix="/api", tags=["user"])


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

@router.post("/login", status_code=status.HTTP_200_OK)
async def api_auth_user(login_data: UserLogin, db: AsyncSession = Depends(get_db)): 
    return await auth_user(db, login_data)

@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def api_create_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    return await create_user(db=db, user_in=user_in)

@router.get("/users", response_model=list[UserRead])
async def api_list_users(id: UUID | None = None, db: AsyncSession = Depends(get_db)):
    return await list_users(db=db, id=id)

@router.patch("/users/{user_id}", response_model=UserRead)
async def api_update_user(user_id: UUID, user_in: UserUpdate, db: AsyncSession = Depends(get_db)):
    updated_user = await update_user(
        db, 
        id=user_id,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        email=user_in.email,
        phone=user_in.phone
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
