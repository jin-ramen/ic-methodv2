from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, or_, func
from sqlalchemy.exc import IntegrityError
from app.schemas.user import UserCreate, UserLogin
from app.models.models import User, UserRole
from app.core.security import hash_password, verify_password, create_access_token

async def auth_user(db: AsyncSession, login_data: UserLogin) -> str: 
    q = select(User).where(
        or_(
            User.email == login_data.identifier,
            User.phone == login_data.identifier
        )
    )
    result = await db.execute(q)
    user = result.scalar_one_or_none()

    if not user: 
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    elif not verify_password(login_data.password, user.hashed_password): 
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong password"
        ) 

    token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}

async def create_user(db: AsyncSession, user_in: UserCreate) -> User:
    data = user_in.model_dump()
    password = data.pop("password")
    hashed_password = hash_password(password)

    new_user = User(
        **data,
        hashed_password=hashed_password
    )

    try:
        db.add(new_user)
        # The unique constraint check happens during the commit
        await db.commit()
        await db.refresh(new_user)
        return new_user
        
    except IntegrityError as e:
        # 1. Rollback the failed transaction so the DB is clean
        await db.rollback()
        
        # 2. Check the error message to see which field failed (Optional)
        error_msg = str(e.orig)
        detail = "User with this email or phone already exists."
        
        if "email" in error_msg:
            detail = "This email is already registered."
        elif "phone" in error_msg:
            detail = "This phone number is already registered."

        # 3. Raise a 400 Bad Request instead of a 500 crash
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )

async def list_users(db: AsyncSession, id: UUID | None = None, search: str | None = None, role: str | None = None) -> list[User]:
    q = select(User)
    if id:
        q = q.where(User.id == id)
    elif search:
        term = f"%{search.lower()}%"
        q = q.where(or_(
            func.lower(User.first_name).like(term),
            func.lower(User.last_name).like(term),
            func.lower(User.email).like(term),
            func.lower(func.concat(User.first_name, ' ', User.last_name)).like(term),
        )).order_by(User.last_name)
    else:
        q = q.order_by(User.last_name)
    if role and not id:
        q = q.where(User.role == role.upper())
    result = await db.scalars(q)
    return result.all()

async def update_user(db: AsyncSession, id: UUID, first_name: str | None, last_name: str | None, email: str | None, phone: str | None, role: str | None) -> User | None:
    user = await db.get(User, id)

    if first_name is not None:
        user.first_name = first_name
    if last_name is not None:
        user.last_name = last_name
    if email is not None:
        user.email = email
    if phone is not None:
        user.phone = phone
    if role is not None:
        user.role = role

    await db.commit()
    await db.refresh(user)
    return user

async def delete_user(db: AsyncSession, id: UUID): 
    result = await db.execute(delete(User).where(User.id == id))
    await db.commit()
    return result.rowcount > 0


