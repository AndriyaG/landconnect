from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Conversation, Listing, Message, User
from app.schemas.chat import ConversationIn, ConversationOut, MessageOut
from app.schemas.user import PublicUser
from app.services import chat_service
from app.services.chat_service import ChatError

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _out(db: Session, conv: Conversation, user_id: int, last: Message | None) -> ConversationOut:
    return ConversationOut(
        id=conv.id,
        listing_id=conv.listing_id,
        other_user=PublicUser.model_validate(db.get(User, conv.other(user_id))),
        last_message=MessageOut.model_validate(last) if last else None,
    )


@router.post("", response_model=ConversationOut)
def create_conversation(
    body: ConversationIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> ConversationOut:
    if body.other_user_id == user.id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Cannot start a conversation with yourself")
    if db.get(User, body.other_user_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if db.get(Listing, body.listing_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")
    if chat_service.is_blocked(db, user.id, body.other_user_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Messaging is blocked between these users")
    conv = chat_service.get_or_create_conversation(db, user.id, body.other_user_id, body.listing_id)
    last = db.scalar(select(Message).where(Message.conversation_id == conv.id).order_by(Message.id.desc()).limit(1))
    return _out(db, conv, user.id, last)


@router.get("", response_model=list[ConversationOut])
def list_conversations(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[ConversationOut]:
    last_id = (
        select(Message.conversation_id, func.max(Message.id).label("mid")).group_by(Message.conversation_id).subquery()
    )
    stmt = (
        select(Conversation, Message)
        .outerjoin(last_id, last_id.c.conversation_id == Conversation.id)
        .outerjoin(Message, Message.id == last_id.c.mid)
        .where(or_(Conversation.user_a == user.id, Conversation.user_b == user.id))
        .order_by(func.coalesce(last_id.c.mid, 0).desc(), Conversation.id.desc())
    )
    return [_out(db, conv, user.id, msg) for conv, msg in db.execute(stmt)]


@router.get("/{conversation_id}/messages", response_model=list[MessageOut])
def list_messages(
    conversation_id: int,
    before: int | None = Query(default=None, ge=1),
    limit: int = Query(default=30, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MessageOut]:
    try:
        chat_service.participant_conversation(db, conversation_id, user.id)
    except ChatError as e:
        raise HTTPException(e.status_code, e.detail)
    stmt = select(Message).where(Message.conversation_id == conversation_id)
    if before is not None:
        stmt = stmt.where(Message.id < before)
    stmt = stmt.order_by(Message.id.desc()).limit(limit)
    return [MessageOut.model_validate(m) for m in db.scalars(stmt)]
