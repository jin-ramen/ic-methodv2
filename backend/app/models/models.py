import uuid
import enum
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    String, Numeric, ForeignKey, Integer, CheckConstraint, 
    UniqueConstraint, Index, DateTime, Enum
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
    )

class Booking(Base):
    __tablename__ = "booking"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("session.id", ondelete="RESTRICT"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"))
    
    notes: Mapped[Optional[str]] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    session: Mapped["Session"] = relationship(lazy="raise")
    user: Mapped["User"] = relationship(lazy="raise")

    __table_args__ = (
        UniqueConstraint("session_id", "user_id", name="uq_booking_session_user"),
    )
