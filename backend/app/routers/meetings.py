from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Meeting, MeetingParticipant, User
from app.schemas.meeting import MeetingIn, MeetingJoinOut, MeetingOut
from app.schemas.user import PublicUser
from app.services import call_service

router = APIRouter(prefix="/meetings", tags=["meetings"])


def _participants(db: Session, meeting_id: int) -> list[User]:
    stmt = (
        select(User)
        .join(MeetingParticipant, MeetingParticipant.user_id == User.id)
        .where(MeetingParticipant.meeting_id == meeting_id)
        .order_by(User.name)
    )
    return list(db.scalars(stmt))


def _out(db: Session, meeting: Meeting) -> MeetingOut:
    host = db.get(User, meeting.host_id)
    return MeetingOut(
        id=meeting.id,
        title=meeting.title,
        host=PublicUser.model_validate(host),
        call_id=meeting.call_id,
        scheduled_at=meeting.scheduled_at,
        participants=[PublicUser.model_validate(u) for u in _participants(db, meeting.id)],
    )


@router.post("", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
def create_meeting(body: MeetingIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> MeetingOut:
    invitee_ids = list(dict.fromkeys(body.invitee_ids))
    if user.id in invitee_ids:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Cannot invite yourself")
    for invitee_id in invitee_ids:
        if db.get(User, invitee_id) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    meeting = Meeting(
        title=body.title,
        host_id=user.id,
        call_id=f"meeting-{uuid4().hex}",
        scheduled_at=body.scheduled_at,
    )
    db.add(meeting)
    db.flush()
    db.add(MeetingParticipant(meeting_id=meeting.id, user_id=user.id))
    for invitee_id in invitee_ids:
        db.add(MeetingParticipant(meeting_id=meeting.id, user_id=invitee_id))
    db.commit()
    db.refresh(meeting)
    return _out(db, meeting)


@router.get("", response_model=list[MeetingOut])
def list_meetings(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[MeetingOut]:
    stmt = (
        select(Meeting)
        .join(MeetingParticipant, MeetingParticipant.meeting_id == Meeting.id)
        .where(MeetingParticipant.user_id == user.id)
        .order_by(Meeting.scheduled_at.desc(), Meeting.id.desc())
    )
    return [_out(db, meeting) for meeting in db.scalars(stmt)]


@router.post("/{meeting_id}/join", response_model=MeetingJoinOut)
def join_meeting(
    meeting_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> MeetingJoinOut:
    meeting = db.get(Meeting, meeting_id)
    if meeting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Meeting not found")
    if db.get(MeetingParticipant, (meeting.id, user.id)) is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a participant of this meeting")
    try:
        call_service.upsert_user(user)
        token = call_service.create_user_token(user)
    except Exception:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Call service unavailable")
    return MeetingJoinOut(
        call_id=meeting.call_id,
        api_key=call_service.api_key(),
        user_id=call_service.stream_user_id(user),
        token=token,
    )
