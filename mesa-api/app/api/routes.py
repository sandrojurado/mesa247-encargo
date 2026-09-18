from fastapi import APIRouter, HTTPException

from app.schemas.waitlist import WaitlistCreate, WaitlistEntry

router = APIRouter()

waitlist: list[WaitlistEntry] = []


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


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
