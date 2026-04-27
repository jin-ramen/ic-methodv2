from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import Booking, Notification, NotificationStatus, NotificationType


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def create_notification(
    db: AsyncSession,
    *,
    booking_id: UUID,
    notification_type: NotificationType,
    send_at: datetime,
) -> Notification:
    notification = Notification(
        booking_id=booking_id,
        type=notification_type,
        status=NotificationStatus.PENDING,
        send_at=send_at,
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return notification


async def get_notification(db: AsyncSession, notification_id: UUID) -> Notification | None:
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    return result.scalar_one_or_none()


async def list_notifications(
    db: AsyncSession,
    *,
    status: NotificationStatus | None = None,
    due_before: datetime | None = None,
) -> list[Notification]:
    stmt = select(Notification)

    if status is not None:
        stmt = stmt.where(Notification.status == status)
    if due_before is not None:
        stmt = stmt.where(Notification.send_at <= due_before)

    stmt = stmt.order_by(Notification.send_at.asc())
    result = await db.execute(stmt)
    return result.scalars().all()


async def list_due_notifications(db: AsyncSession, now: datetime | None = None) -> list[Notification]:
    now = now or _utcnow()
    result = await db.execute(
        select(Notification)
        .where(
            Notification.status == NotificationStatus.PENDING,
            Notification.send_at <= now,
        )
        .options(selectinload(Notification.booking))
    )
    return result.scalars().all()


async def mark_notification_sent(
    db: AsyncSession,
    notification_id: UUID,
    sent_at: datetime | None = None,
) -> Notification | None:
    notification = await get_notification(db, notification_id)
    if not notification:
        return None

    notification.status = NotificationStatus.SENT
    notification.sent_at = sent_at or _utcnow()
    await db.commit()
    await db.refresh(notification)
    return notification


async def mark_notification_failed(
    db: AsyncSession,
    notification_id: UUID,
    error_message: str | None = None,
) -> Notification | None:
    notification = await get_notification(db, notification_id)
    if not notification:
        return None

    notification.status = NotificationStatus.FAILED
    notification.error_message = error_message
    await db.commit()
    await db.refresh(notification)
    return notification