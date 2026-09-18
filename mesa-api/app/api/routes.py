from datetime import datetime, timezone
import re
from collections.abc import Iterator

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import Customer, Location, QueueEntry
from app.models.queue import QueueStatus
from app.schemas.waitlist import LocationRead, QueueCreate, QueueRead, WaitlistCreate, WaitlistEntry

router = APIRouter()

waitlist: list[WaitlistEntry] = []
phone_cleanup = re.compile(r"[\s().-]+")


def get_db() -> Iterator[Session]:
    with SessionLocal() as db:
        yield db


def normalize_phone(phone: str) -> str:
    normalized = phone_cleanup.sub("", phone.strip())
    if len(normalized) > 15:
        raise HTTPException(status_code=422, detail="Phone must be 15 characters or fewer")
    return normalized


def get_queue_position(db: Session, entry: QueueEntry) -> int:
    position = db.scalar(
        select(func.count(QueueEntry.id)).where(
            QueueEntry.location_id == entry.location_id,
            QueueEntry.status == QueueStatus.WAITING,
            QueueEntry.sort_order <= entry.sort_order,
        )
    )
    return int(position or 0)


def to_queue_read(db: Session, entry: QueueEntry) -> QueueRead:
    return QueueRead(
        id=entry.id,
        location_id=entry.location_id,
        location_name=entry.location.name,
        customer_name=entry.customer.name,
        phone=entry.customer.phone,
        party_size=entry.seats,
        position=get_queue_position(db, entry),
        status=entry.status.value,
    )


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/locations", response_model=list[LocationRead])
def list_locations(db: Session = Depends(get_db)) -> list[LocationRead]:
    locations = db.scalars(select(Location).order_by(Location.name)).all()
    return [LocationRead(id=location.id, name=location.name) for location in locations]


@router.post("/queue", response_model=QueueRead, status_code=201)
def join_queue(payload: QueueCreate, db: Session = Depends(get_db)) -> QueueRead:
    location = db.get(Location, payload.location_id)
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found")

    customer_name = payload.name.strip()
    if not customer_name:
        raise HTTPException(status_code=422, detail="Name is required")

    phone = normalize_phone(payload.phone)
    customer = db.scalar(select(Customer).where(Customer.phone == phone))

    if customer is None:
        customer = Customer(name=customer_name, phone=phone)
        db.add(customer)
        db.flush()
    else:
        customer.name = customer_name
        customer.updated_at = datetime.now(timezone.utc)

    next_sort_order = db.scalar(
        select(func.coalesce(func.max(QueueEntry.sort_order), 0) + 1).where(
            QueueEntry.location_id == location.id,
            QueueEntry.status == QueueStatus.WAITING,
        )
    )

    entry = QueueEntry(
        location_id=location.id,
        customer_id=customer.id,
        seats=payload.party_size,
        sort_order=min(int(next_sort_order or 1), 99),
        status=QueueStatus.WAITING,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return to_queue_read(db, entry)


@router.get("/queue/{queue_id}", response_model=QueueRead)
def get_queue_entry(queue_id: int, db: Session = Depends(get_db)) -> QueueRead:
    entry = db.get(QueueEntry, queue_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Queue entry not found")
    return to_queue_read(db, entry)


@router.patch("/queue/{queue_id}/cancel", response_model=QueueRead)
def cancel_queue_entry(queue_id: int, db: Session = Depends(get_db)) -> QueueRead:
    entry = db.get(QueueEntry, queue_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Queue entry not found")

    entry.status = QueueStatus.CANCELLED
    entry.cancelled_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(entry)
    return to_queue_read(db, entry)


@router.post("/waitlist", response_model=WaitlistEntry, status_code=201)
def join_waitlist(payload: WaitlistCreate) -> WaitlistEntry:
    entry = WaitlistEntry(
        id=len(waitlist) + 1,
        position=len(waitlist) + 1,
        **payload.model_dump(),
    )
    waitlist.append(entry)
    return entry


@router.get("/waitlist", response_model=list[WaitlistEntry])
def list_waitlist() -> list[WaitlistEntry]:
    return waitlist


@router.get("/waitlist/{entry_id}", response_model=WaitlistEntry)
def get_waitlist_entry(entry_id: int) -> WaitlistEntry:
    for entry in waitlist:
        if entry.id == entry_id:
            return entry
    raise HTTPException(status_code=404, detail="Waitlist entry not found")
