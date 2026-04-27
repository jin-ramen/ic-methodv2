from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import Booking, BookingStatus, Notification, NotificationStatus, NotificationType, Session
from app.services.notification import mark_notification_failed, mark_notification_sent
from app.core.email import send_booking_reminder_email


async def process_due_reminders(db: AsyncSession) -> None:
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Notification)
        .where(
            Notification.status == NotificationStatus.PENDING,
            Notification.type == NotificationType.REMINDER,
            Notification.send_at <= now,
        )
        .options(
            selectinload(Notification.booking).options(
                selectinload(Booking.user),
                selectinload(Booking.session).selectinload(Session.method),
            )
        )
    )
    notifications = result.scalars().all()

    for notification in notifications:
        booking = notification.booking

        if not booking or booking.status != BookingStatus.BOOKED:
            await mark_notification_failed(db, notification.id, "Booking not active")
            continue

        to_email = booking.user.email if booking.user else booking.email
        first_name = booking.user.first_name if booking.user else (booking.first_name or "there")

        if not to_email:
            await mark_notification_failed(db, notification.id, "Missing recipient email")
            continue

        try:
            await send_booking_reminder_email(
                to_email=to_email,
                first_name=first_name,
                session_start=booking.session.start_time if booking.session else None,
                session_end=booking.session.end_time if booking.session else None,
                method_name=booking.session.method.name if booking.session and booking.session.method else None,
            )
            await mark_notification_sent(db, notification.id)
        except Exception as e:
            await mark_notification_failed(db, notification.id, str(e))
