from datetime import datetime, timezone
import asyncio
import base64
import binascii
import hashlib
import hmac
import json
import re
import time
from collections.abc import AsyncIterator, Iterator
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Admin, Customer, Location, Operator, QueueEntry
from app.models.queue import OperatorStatus, QueueStatus
from app.schemas.waitlist import (
    AuthSession,
    AuthUser,
    HostQueueEntry,
    LocationRead,
    LoginRequest,
    QueueCreate,
    QueueReorderRequest,
    QueueRead,
    QueueStatusUpdate,
    WaitlistCreate,
    WaitlistEntry,
)

router = APIRouter()

waitlist: list[WaitlistEntry] = []
phone_cleanup = re.compile(r"[\s().-]+")
queue_event_subscribers: dict[int, list[asyncio.Queue[str]]] = {}


def get_db() -> Iterator[Session]:
    with SessionLocal() as db:
        yield db


def normalize_phone(phone: str) -> str:
    normalized = phone_cleanup.sub("", phone.strip())
    if len(normalized) > 15:
        raise HTTPException(status_code=422, detail="Phone must be 15 characters or fewer")
    return normalized


def encode_auth_token(payload: dict[str, Any]) -> str:
    token_payload = {
        **payload,
        "exp": int(time.time()) + settings.auth_session_minutes * 60,
    }
    payload_bytes = json.dumps(
        token_payload,
        separators=(",", ":"),
        sort_keys=True,
    ).encode()
    encoded_payload = base64.urlsafe_b64encode(payload_bytes).decode().rstrip("=")
    signature = hmac.new(
        settings.auth_secret.encode(),
        encoded_payload.encode(),
        hashlib.sha256,
    ).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return f"{encoded_payload}.{encoded_signature}"


def decode_auth_token(token: str) -> dict[str, Any]:
    try:
        encoded_payload, encoded_signature = token.split(".", 1)
        expected_signature = hmac.new(
            settings.auth_secret.encode(),
            encoded_payload.encode(),
            hashlib.sha256,
        ).digest()
        received_signature = base64.urlsafe_b64decode(
            encoded_signature + "=" * (-len(encoded_signature) % 4)
        )
        if not hmac.compare_digest(expected_signature, received_signature):
            raise HTTPException(status_code=401, detail="Invalid session")

        payload_bytes = base64.urlsafe_b64decode(
            encoded_payload + "=" * (-len(encoded_payload) % 4)
        )
        payload = json.loads(payload_bytes)
    except (ValueError, binascii.Error, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid session") from exc
    if int(payload.get("exp", 0)) < int(time.time()):
        raise HTTPException(status_code=401, detail="Session expired")
    return payload


def operator_to_auth_user(operator: Operator) -> AuthUser:
    return AuthUser(
        id=operator.id,
        username=operator.username,
        role="operator",
        location_id=operator.location_id,
        location_name=operator.location.name,
    )


def admin_to_auth_user(admin: Admin) -> AuthUser:
    return AuthUser(id=admin.id, username=admin.username, role="admin")


def authenticate_user(db: Session, payload: LoginRequest) -> AuthUser:
    username = payload.username.strip()
    admin = db.scalar(select(Admin).where(Admin.username == username))
    if admin is not None and hmac.compare_digest(admin.password, payload.password):
        return admin_to_auth_user(admin)

    operator = db.scalar(select(Operator).where(Operator.username == username))
    if (
        operator is not None
        and operator.status == OperatorStatus.ENABLED
        and hmac.compare_digest(operator.password, payload.password)
    ):
        return operator_to_auth_user(operator)

    raise HTTPException(status_code=401, detail="Invalid username or password")


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> AuthUser:
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing session")

    payload = decode_auth_token(authorization.removeprefix("Bearer ").strip())
    role = payload.get("role")
    user_id = payload.get("sub")
    if role == "admin":
        admin = db.get(Admin, user_id)
        if admin is None:
            raise HTTPException(status_code=401, detail="Invalid session")
        return admin_to_auth_user(admin)

    if role == "operator":
        operator = db.get(Operator, user_id)
        if operator is None or operator.status != OperatorStatus.ENABLED:
            raise HTTPException(status_code=401, detail="Invalid session")
        return operator_to_auth_user(operator)

    raise HTTPException(status_code=401, detail="Invalid session")


def get_current_user_from_token(token: str, db: Session) -> AuthUser:
    payload = decode_auth_token(token)
    role = payload.get("role")
    user_id = payload.get("sub")
    if role == "admin":
        admin = db.get(Admin, user_id)
        if admin is None:
            raise HTTPException(status_code=401, detail="Invalid session")
        return admin_to_auth_user(admin)

    if role == "operator":
        operator = db.get(Operator, user_id)
        if operator is None or operator.status != OperatorStatus.ENABLED:
            raise HTTPException(status_code=401, detail="Invalid session")
        return operator_to_auth_user(operator)

    raise HTTPException(status_code=401, detail="Invalid session")


def get_host_location_id(current_user: AuthUser) -> Optional[int]:
    if current_user.role == "operator":
        if current_user.location_id is None:
            raise HTTPException(status_code=403, detail="Operator has no location")
        return current_user.location_id
    return None


def calculate_elapsed_seconds(started_at: datetime) -> int:
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    return max(0, int((datetime.now(timezone.utc) - started_at).total_seconds()))


def normalize_waiting_order(db: Session, location_id: int) -> None:
    entries = db.scalars(
        select(QueueEntry)
        .where(
            QueueEntry.location_id == location_id,
            QueueEntry.status == QueueStatus.WAITING,
        )
        .order_by(QueueEntry.sort_order, QueueEntry.created_at, QueueEntry.id)
    ).all()
    for index, entry in enumerate(entries, start=1):
        entry.sort_order = min(index, 99)


def broadcast_queue_event(location_id: int) -> None:
    for subscriber in queue_event_subscribers.get(location_id, []):
        subscriber.put_nowait("refresh")


def get_entry_position(db: Session, entry: QueueEntry) -> int:
    if entry.status != QueueStatus.WAITING:
        return 0
    return get_queue_position(db, entry)


def to_host_queue_entry(db: Session, entry: QueueEntry) -> HostQueueEntry:
    completed_visits = db.scalar(
        select(func.count(QueueEntry.id)).where(
            QueueEntry.customer_id == entry.customer_id,
            QueueEntry.status == QueueStatus.COMPLETED,
        )
    )
    return HostQueueEntry(
        id=entry.id,
        location_id=entry.location_id,
        location_name=entry.location.name,
        customer_name=entry.customer.name,
        phone=entry.customer.phone,
        party_size=entry.seats,
        position=get_entry_position(db, entry),
        status=entry.status.value,
        sort_order=entry.sort_order,
        elapsed_seconds=calculate_elapsed_seconds(entry.created_at),
        called_elapsed_seconds=(
            calculate_elapsed_seconds(entry.started_at)
            if entry.started_at is not None
            else None
        ),
        is_frequent=int(completed_visits or 0) > 1,
    )


def get_visible_host_entries(
    db: Session, location_id: Optional[int]
) -> list[QueueEntry]:
    query = select(QueueEntry).where(
        QueueEntry.status.in_(
            [QueueStatus.WAITING, QueueStatus.SERVING, QueueStatus.ACCEPTED]
        )
    )
    if location_id is not None:
        query = query.where(QueueEntry.location_id == location_id)
    return db.scalars(
        query.order_by(QueueEntry.location_id, QueueEntry.sort_order, QueueEntry.id)
    ).all()


def get_queue_position(db: Session, entry: QueueEntry) -> int:
    ordered_queue = (
        select(
            QueueEntry.id.label("queue_id"),
            func.row_number()
            .over(
                order_by=(
                    QueueEntry.sort_order.asc(),
                    QueueEntry.created_at.asc(),
                    QueueEntry.id.asc(),
                )
            )
            .label("position"),
        )
        .where(
            QueueEntry.location_id == entry.location_id,
            QueueEntry.status == QueueStatus.WAITING,
        )
        .subquery()
    )
    position = db.scalar(
        select(ordered_queue.c.position).where(ordered_queue.c.queue_id == entry.id)
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
        elapsed_seconds=calculate_elapsed_seconds(entry.created_at),
    )


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/auth/login", response_model=AuthSession)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthSession:
    user = authenticate_user(db, payload)
    token = encode_auth_token({"sub": user.id, "role": user.role})
    return AuthSession(token=token, user=user)


@router.get("/auth/session", response_model=AuthUser)
def validate_session(current_user: AuthUser = Depends(get_current_user)) -> AuthUser:
    return current_user


@router.get("/locations", response_model=list[LocationRead])
def list_locations(db: Session = Depends(get_db)) -> list[LocationRead]:
    locations = db.scalars(select(Location).order_by(Location.name)).all()
    return [LocationRead(id=location.id, name=location.name) for location in locations]


@router.get("/host/queue", response_model=list[HostQueueEntry])
def list_host_queue(
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[HostQueueEntry]:
    location_id = get_host_location_id(current_user)
    entries = get_visible_host_entries(db, location_id)
    return [to_host_queue_entry(db, entry) for entry in entries]


@router.patch("/host/queue/{queue_id}/status", response_model=HostQueueEntry)
def update_host_queue_status(
    queue_id: int,
    payload: QueueStatusUpdate,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HostQueueEntry:
    requested_status = payload.status.upper()
    if requested_status not in {QueueStatus.SERVING.value, QueueStatus.COMPLETED.value}:
        raise HTTPException(status_code=422, detail="Unsupported queue status")

    entry = db.get(QueueEntry, queue_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Queue entry not found")

    location_id = get_host_location_id(current_user)
    if location_id is not None and entry.location_id != location_id:
        raise HTTPException(status_code=403, detail="Queue entry belongs to another location")

    if requested_status == QueueStatus.SERVING.value:
        if entry.status != QueueStatus.WAITING:
            raise HTTPException(status_code=409, detail="Only waiting entries can be called")
        entry.status = QueueStatus.SERVING
        entry.started_at = datetime.now(timezone.utc)
    else:
        if entry.status not in {QueueStatus.SERVING, QueueStatus.ACCEPTED}:
            raise HTTPException(
                status_code=409,
                detail="Only serving or accepted entries can be seated",
            )
        entry.status = QueueStatus.COMPLETED
        entry.completed_at = datetime.now(timezone.utc)

    db.flush()
    normalize_waiting_order(db, entry.location_id)
    db.commit()
    db.refresh(entry)
    broadcast_queue_event(entry.location_id)
    return to_host_queue_entry(db, entry)


@router.patch("/host/queue/reorder", response_model=list[HostQueueEntry])
def reorder_host_queue(
    payload: QueueReorderRequest,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[HostQueueEntry]:
    location_id = get_host_location_id(current_user)
    if location_id is None:
        raise HTTPException(status_code=422, detail="A location is required to reorder")

    waiting_entries = db.scalars(
        select(QueueEntry)
        .where(
            QueueEntry.location_id == location_id,
            QueueEntry.status == QueueStatus.WAITING,
        )
        .order_by(QueueEntry.sort_order, QueueEntry.created_at, QueueEntry.id)
    ).all()

    waiting_entries_by_id = {entry.id: entry for entry in waiting_entries}
    requested_ids = list(dict.fromkeys(payload.queue_ids))
    if set(requested_ids) != set(waiting_entries_by_id):
        raise HTTPException(status_code=422, detail="Invalid waiting queue order")

    for index, queue_id in enumerate(requested_ids, start=1):
        waiting_entries_by_id[queue_id].sort_order = min(index, 99)

    db.commit()
    broadcast_queue_event(location_id)
    refreshed_entries = get_visible_host_entries(db, location_id)
    return [to_host_queue_entry(db, entry) for entry in refreshed_entries]


@router.get("/host/queue/events")
def stream_host_queue_events(
    token: str = Query(min_length=1),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    current_user = get_current_user_from_token(token, db)
    location_id = get_host_location_id(current_user)
    if location_id is None:
        raise HTTPException(status_code=422, detail="A location is required for events")

    async def event_generator() -> AsyncIterator[str]:
        subscriber: asyncio.Queue[str] = asyncio.Queue()
        queue_event_subscribers.setdefault(location_id, []).append(subscriber)
        try:
            yield "event: refresh\ndata: connected\n\n"
            while True:
                try:
                    event_name = await asyncio.wait_for(subscriber.get(), timeout=20)
                    yield f"event: {event_name}\ndata: {location_id}\n\n"
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            queue_event_subscribers[location_id].remove(subscriber)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/queue/events")
def stream_queue_events(location_id: int = Query(gt=0)) -> StreamingResponse:
    async def event_generator() -> AsyncIterator[str]:
        subscriber: asyncio.Queue[str] = asyncio.Queue()
        queue_event_subscribers.setdefault(location_id, []).append(subscriber)
        try:
            yield "event: refresh\ndata: connected\n\n"
            while True:
                try:
                    event_name = await asyncio.wait_for(subscriber.get(), timeout=20)
                    yield f"event: {event_name}\ndata: {location_id}\n\n"
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            queue_event_subscribers[location_id].remove(subscriber)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


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
    broadcast_queue_event(entry.location_id)
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
    db.flush()
    normalize_waiting_order(db, entry.location_id)
    db.commit()
    db.refresh(entry)
    broadcast_queue_event(entry.location_id)
    return to_queue_read(db, entry)


@router.patch("/queue/{queue_id}/accept", response_model=QueueRead)
def accept_queue_entry(queue_id: int, db: Session = Depends(get_db)) -> QueueRead:
    entry = db.get(QueueEntry, queue_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Queue entry not found")
    if entry.status != QueueStatus.SERVING:
        raise HTTPException(status_code=409, detail="Only called entries can be accepted")

    entry.status = QueueStatus.ACCEPTED
    db.commit()
    db.refresh(entry)
    broadcast_queue_event(entry.location_id)
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
