import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Numeric, ForeignKey, Integer, CheckConstraint, UniqueConstraint, Index, DateTime
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base


class Method(Base):
    __tablename__ = "method"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    price = Column(Numeric(6, 2), nullable=False) # $9999.99
    description = Column(String(1000))


class Flow(Base):
    __tablename__ = "flow"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    method_id = Column(UUID(as_uuid=True), ForeignKey("method.id", ondelete="SET NULL"), nullable=True)
    method = relationship("Method", lazy="raise")
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    capacity = Column(Integer, nullable=False, default=1)
    instructor = Column(String(200))
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint("end_time > start_time", name="ck_flow_end_after_start"),
        Index("ix_flow_start_time", "start_time"),
    )


class Commitment(Base):
    __tablename__ = "commitment"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    flow_id = Column(UUID(as_uuid=True), ForeignKey("flow.id", ondelete="RESTRICT"))
    flow = relationship("Flow", lazy="raise")
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    notes = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("flow_id", "email", name="uq_commitment_flow_email"),
    )


