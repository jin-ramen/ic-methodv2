from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.models import NotificationStatus
from app.schemas.notification import (
    NotificationCreate,
    NotificationMarkFailedRequest,
    NotificationResponse,
)
from app.services.notification import (
    create_notification,
    get_notification,
    list_notifications,
    mark_notification_failed,
    mark_notification_sent,
)

router = APIRouter(prefix="/api/notifications", tags=["notification"])


@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification_route(
    payload: NotificationCreate,
    db: AsyncSession = Depends(get_db),
):
    return await create_notification(
        db,
        booking_id=payload.booking_id,
        notification_type=payload.type,
        send_at=payload.send_at,
    )


@router.get("", response_model=list[NotificationResponse])
async def list_notifications_route(
    status_filter: NotificationStatus | None = None,
    due_before: datetime | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await list_notifications(db, status=status_filter, due_before=due_before)


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification_route(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    notification = await get_notification(db, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return notification


@router.patch("/{notification_id}/sent", response_model=NotificationResponse)
async def mark_sent_route(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    notification = await mark_notification_sent(db, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return notification


@router.patch("/{notification_id}/failed", response_model=NotificationResponse)
async def mark_failed_route(
    notification_id: UUID,
    payload: NotificationMarkFailedRequest,
    db: AsyncSession = Depends(get_db),
):
    notification = await mark_notification_failed(
        db,
        notification_id,
        payload.error_message,
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return notification