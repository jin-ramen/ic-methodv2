import uuid
import enum
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    String, Numeric, ForeignKey, Integer, CheckConstraint,
    UniqueConstraint, Index, DateTime, Enum, text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship, DeclarativeBase

# Define base class
class Base(DeclarativeBase):
    pass

class UserRole(str, enum.Enum):
    OWNER = "owner"
    STAFF = "staff"
    MEMBER = "member"

class User(Base): 
    __tablename__ = "user"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name: Mapped[str] = mapped_column(String(255))
    last_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.MEMBER)
    phone: Mapped[Optional[str]] = mapped_column(String(20), unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

class Method(Base):
    __tablename__ = "method"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    price: Mapped[Decimal] = mapped_column(Numeric(6, 2))
    description: Mapped[Optional[str]] = mapped_column(String(1000))

class Session(Base):
    __tablename__ = "session"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    method_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("method.id", ondelete="SET NULL"))
    
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    capacity: Mapped[int] = mapped_column(Integer, default=1)
    instructor: Mapped[Optional[str]] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    method: Mapped["Method"] = relationship(lazy="raise")

    __table_args__ = (
        CheckConstraint("end_time > start_time", name="ck_session_end_after_start"),
        Index("ix_session_start_time", "start_time"),
        UniqueConstraint("instructor", "start_time", name="uq_session_instructor_start_time"),
    )

class BookingStatus(str, enum.Enum):
    BOOKED = "booked"
    CANCELLED = "cancelled"

class Booking(Base):
    __tablename__ = "booking"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("session.id", ondelete="RESTRICT"))
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"), nullable=True)

    # Guest-only fields (null when user_id is set)
    first_name: Mapped[Optional[str]] = mapped_column(String(255))
    last_name: Mapped[Optional[str]] = mapped_column(String(255))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(20))

    notes: Mapped[Optional[str]] = mapped_column(String(1000))
    status: Mapped[str] = mapped_column(String(20), default=BookingStatus.BOOKED, server_default="booked")
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    session: Mapped["Session"] = relationship(lazy="raise")
    user: Mapped[Optional["User"]] = relationship(lazy="raise")

    __table_args__ = (
        Index(
            "uq_booking_active_session_user",
            "session_id",
            "user_id",
            unique=True,
            postgresql_where=text("status = 'booked' AND user_id IS NOT NULL"),
        ),
    )

class NotificationStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"

class NotificationType(str, enum.Enum):
    CONFIRMATION = "CONFIRMATION"
    REMINDER = "REMINDER"
    CANCELLATION = "CANCELLATION"
    OTHERS = "OTHERS"


class Notification(Base):
    __tablename__ = "notification"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("booking.id", ondelete="CASCADE"), nullable=False)

    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus, name="notification_status"),
        default=NotificationStatus.PENDING,
        nullable=False,
    )
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type"),
        nullable=False,
    )

    send_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)

    booking: Mapped["Booking"] = relationship("Booking")