from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.call import CallHistoryOut, CallStartIn, CallStartOut, CallStatusIn, CallTokenOut
from app.schemas.user import PublicUser
from app.services import call_service
from app.services.call_service import CallError

router = APIRouter(prefix="/calls", tags=["calls"])


def _raise(error: CallError) -> None:
    raise HTTPException(error.status_code, error.detail)


def _history_out(db: Session, log, user_id: int) -> CallHistoryOut:
    other_id = log.callee_id if log.caller_id == user_id else log.caller_id
    other = db.get(User, other_id)
    return CallHistoryOut(
        id=log.id,
        call_id=log.call_id,
        type=log.type,
        status=log.status,
        started_at=log.started_at,
        ended_at=log.ended_at,
        direction="outgoing" if log.caller_id == user_id else "incoming",
        other_user=PublicUser.model_validate(other),
    )


@router.post("/token", response_model=CallTokenOut)
def call_token(user: User = Depends(get_current_user)) -> CallTokenOut:
    try:
        call_service.upsert_user(user)
        token = call_service.create_user_token(user)
    except Exception:
        raise HTTPException(502, "Call service unavailable")
    return CallTokenOut(api_key=call_service.api_key(), user_id=call_service.stream_user_id(user), token=token)


@router.post("/start", response_model=CallStartOut)
def start_call(body: CallStartIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> CallStartOut:
    try:
        log = call_service.start_call(db, user, body.callee_id, body.type)
    except CallError as error:
        _raise(error)
    return CallStartOut(call_id=log.call_id)


@router.post("/{call_id}/status", response_model=CallHistoryOut)
def update_call_status(
    call_id: str, body: CallStatusIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> CallHistoryOut:
    try:
        log = call_service.update_status(db, user, call_id, body.status)
    except CallError as error:
        _raise(error)
    return _history_out(db, log, user.id)


@router.get("/history", response_model=list[CallHistoryOut])
def call_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[CallHistoryOut]:
    return [_history_out(db, log, user.id) for log in call_service.history_for(db, user)]
