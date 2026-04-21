import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, ForeignKey, DateTime, Time,
    CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, TSTZRANGE, ExcludeConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class Resource(Base):
    __tablename__ = "resources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    capacity = Column(Integer, nullable=False, default=1)
    duration_minutes = Column(Integer, nullable=False, default=30)
    buffer_minutes = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    # Optional: link a bookable resource back to a Notion page if it mirrors one
    notion_page_id = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("capacity >= 1", name="resources_capacity_positive"),
        CheckConstraint("duration_minutes > 0", name="resources_duration_positive"),
    )


class AvailabilityRule(Base):
    __tablename__ = "availability_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    resource = relationship("Resource")

    __table_args__ = (
        CheckConstraint("day_of_week BETWEEN 0 AND 6", name="rules_valid_dow"),
        CheckConstraint("end_time > start_time", name="rules_end_after_start"),
        Index("ix_rules_resource_dow", "resource_id", "day_of_week"),
    )


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="RESTRICT"), nullable=False)
    customer_email = Column(String(320), nullable=False)
    customer_name = Column(String(200), nullable=False)
    time_range = Column(TSTZRANGE, nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'confirmed', 'cancelled', 'completed')",
            name="bookings_valid_status",
        ),
        ExcludeConstraint(
            ("resource_id", "="),
            ("time_range", "&&"),
            where="status IN ('pending', 'confirmed')",
            using="gist",
            name="bookings_no_overlap",
        ),
    )