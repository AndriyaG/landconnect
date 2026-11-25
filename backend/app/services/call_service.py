from datetime import datetime, timezone
from functools import lru_cache
from uuid import uuid4

from getstream import Stream
from getstream.models import CallRequest, MemberRequest, UserRequest
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.config import STREAM_API_KEY, STREAM_API_SECRET
from app.models import CallLog, CallPrivacy, CallStatus, CallType, Conversation, User
from app.services import chat_service

TOKEN_TTL_SECONDS = 24 * 3600
CALL_TYPE = "default"

# Stream dashboard (applied manually, not by this app):
# Video & Audio → Call Types → "default" → Permissions.
# Remove CreateCall, UpdateCall, and UpdateCallMember from the "user" role so a
# client token cannot getOrCreate or ring a call. Keep JoinCall, ReadCall,
# SendAudio, SendVideo, and EndCall on "call_member". The API secret used here
# bypasses those grants, so only this server can create calls.


class CallError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


@lru_cache
def _client() -> Stream:
    if not STREAM_API_KEY or not STREAM_API_SECRET:
        raise RuntimeError("STREAM_API_KEY and STREAM_API_SECRET must be set")
    return Stream(api_key=STREAM_API_KEY, api_secret=STREAM_API_SECRET)


def stream_user_id(user: User) -> str:
    return str(user.id)


def upsert_user(user: User) -> None:
    _client().upsert_users(UserRequest(id=stream_user_id(user), name=user.name))


def create_user_token(user: User) -> str:
    return _client().create_token(stream_user_id(user), expiration=TOKEN_TTL_SECONDS)


def api_key() -> str:
    return STREAM_API_KEY


def _members(user_ids: list[str]) -> list[MemberRequest]:
    return [MemberRequest(user_id=user_id) for user_id in user_ids]


def create_ringing_call(caller: User, callee: User, call_id: str, video: bool) -> None:
    upsert_user(caller)
    upsert_user(callee)
    call = _client().video.call(CALL_TYPE, call_id)
    call.get_or_create(
        ring=True,
        video=video,
        data=CallRequest(
            created_by_id=stream_user_id(caller),
            members=_members([stream_user_id(caller), stream_user_id(callee)]),
            custom={"video": video, "logged": True},
        ),
    )


def open_meeting_call(call_id: str, host_id: int, member_ids: list[int]) -> None:
    call = _client().video.call(CALL_TYPE, call_id)
    call.get_or_create(
        ring=False,
        video=True,
        data=CallRequest(
            created_by_id=str(host_id),
            members=_members([str(member_id) for member_id in member_ids]),
            custom={"video": True, "logged": False},
        ),
    )


def _has_conversation(db: Session, a: int, b: int) -> bool:
    user_a, user_b = sorted((a, b))
    stmt = select(Conversation.id).where(Conversation.user_a == user_a, Conversation.user_b == user_b).limit(1)
    return db.scalar(stmt) is not None


def start_call(db: Session, caller: User, callee_id: int, call_type: CallType) -> CallLog:
    if callee_id == caller.id:
        raise CallError(422, "Cannot call yourself")
    callee = db.get(User, callee_id)
    if callee is None:
        raise CallError(404, "User not found")
    if chat_service.is_blocked(db, caller.id, callee.id):
        raise CallError(403, "blocked")
    if callee.call_privacy == CallPrivacy.contacts and not _has_conversation(db, caller.id, callee.id):
        raise CallError(403, "not accepting calls")
    call_id = uuid4().hex
    try:
        create_ringing_call(caller, callee, call_id, call_type == CallType.video)
    except CallError:
        raise
    except Exception:
        raise CallError(502, "Call service unavailable")
    log = CallLog(
        call_id=call_id,
        caller_id=caller.id,
        callee_id=callee.id,
        type=call_type,
        status=CallStatus.ringing,
        started_at=datetime.now(timezone.utc),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def update_status(db: Session, user: User, call_id: str, status: str) -> CallLog:
    log = db.scalar(select(CallLog).where(CallLog.call_id == call_id))
    if log is None:
        raise CallError(404, "Call not found")
    if user.id not in (log.caller_id, log.callee_id):
        raise CallError(403, "Not a participant of this call")
    if log.status in (CallStatus.rejected, CallStatus.ended, CallStatus.missed):
        return log
    if log.status == CallStatus.accepted and status != "ended":
        return log
    log.status = CallStatus(status)
    if status in ("rejected", "ended", "missed"):
        log.ended_at = datetime.now(timezone.utc)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def history_for(db: Session, user: User) -> list[CallLog]:
    stmt = (
        select(CallLog)
        .where(or_(CallLog.caller_id == user.id, CallLog.callee_id == user.id))
        .order_by(CallLog.started_at.desc(), CallLog.id.desc())
    )
    return list(db.scalars(stmt))
