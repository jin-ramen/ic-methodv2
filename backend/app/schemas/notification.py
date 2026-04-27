from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.models import NotificationStatus, NotificationType


class NotificationCreate(BaseModel):
    booking_id: UUID
    type: NotificationType
    send_at: datetime


class NotificationMarkFailedRequest(BaseModel):
    error_message: str | None = None


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    booking_id: UUID
    type: NotificationType
    status: NotificationStatus
    send_at: datetime
    sent_at: datetime | None = None
    error_message: str | None = None