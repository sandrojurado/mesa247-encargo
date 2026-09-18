from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.mysql import BIGINT, TINYINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class OperatorStatus(str, Enum):
    ENABLED = "ENABLED"
    DISABLED = "DISABLED"


class QueueStatus(str, Enum):
    WAITING = "WAITING"
    SERVING = "SERVING"
    CANCELLED = "CANCELLED"
    ACCEPTED = "ACCEPTED"
    COMPLETED = "COMPLETED"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Location(TimestampMixin, Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    operators: Mapped[list["Operator"]] = relationship(back_populates="location")
    queue_entries: Mapped[list["QueueEntry"]] = relationship(back_populates="location")


class Admin(TimestampMixin, Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)


class Operator(Base):
    __tablename__ = "operators"

    id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    location_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("locations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[OperatorStatus] = mapped_column(
        SQLEnum(OperatorStatus), nullable=False, default=OperatorStatus.ENABLED
    )

    location: Mapped[Location] = relationship(back_populates="operators")


class Customer(TimestampMixin, Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    phone: Mapped[str] = mapped_column(String(15), unique=True, nullable=False)

    queue_entries: Mapped[list["QueueEntry"]] = relationship(back_populates="customer")


class QueueEntry(TimestampMixin, Base):
    __tablename__ = "queue"

    id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True), primary_key=True, autoincrement=True
    )
    location_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("locations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    customer_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    seats: Mapped[int] = mapped_column(TINYINT(unsigned=True), nullable=False)
    status: Mapped[QueueStatus] = mapped_column(
        SQLEnum(QueueStatus), nullable=False, default=QueueStatus.WAITING, index=True
    )
    sort_order: Mapped[int] = mapped_column(
        TINYINT(unsigned=True), nullable=False, default=0
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    location: Mapped[Location] = relationship(back_populates="queue_entries")
    customer: Mapped[Customer] = relationship(back_populates="queue_entries")
