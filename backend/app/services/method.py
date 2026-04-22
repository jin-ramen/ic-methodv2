from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from app.models.models import Method


async def create_method(db: AsyncSession, name: str, price: float, description: str | None) -> Method:
    method = Method(name=name, price=price, description=description)
    db.add(method)
    await db.commit()
    await db.refresh(method)
    return method


async def list_methods(db: AsyncSession) -> list[Method]:
    result = await db.execute(select(Method).order_by(Method.name))
    return result.scalars().all()


async def update_method(db: AsyncSession, id: UUID, name: str | None, price: float | None, description: str | None) -> Method | None:
    values = {k: v for k, v in {"name": name, "price": price, "description": description}.items() if v is not None}
    if values:
        await db.execute(update(Method).where(Method.id == id).values(**values))
        await db.commit()
    result = await db.execute(select(Method).where(Method.id == id))
    return result.scalar_one_or_none()


async def delete_method(db: AsyncSession, id: UUID) -> bool:
    result = await db.execute(delete(Method).where(Method.id == id))
    await db.commit()
    return result.rowcount > 0
