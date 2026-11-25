from sqlalchemy import and_, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Block, Conversation, Message


class ChatError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


def is_blocked(db: Session, a: int, b: int) -> bool:
    stmt = select(Block).where(
        or_(and_(Block.blocker_id == a, Block.blocked_id == b), and_(Block.blocker_id == b, Block.blocked_id == a))
    )
    return db.scalar(stmt.limit(1)) is not None


def get_or_create_conversation(db: Session, user_id: int, other_id: int, listing_id: int) -> Conversation:
    a, b = sorted((user_id, other_id))
    stmt = select(Conversation).where(
        Conversation.user_a == a, Conversation.user_b == b, Conversation.listing_id == listing_id
    )
    conv = db.scalar(stmt)
    if conv is not None:
        return conv
    conv = Conversation(user_a=a, user_b=b, listing_id=listing_id)
    db.add(conv)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return db.scalars(stmt).one()
    return conv


def participant_conversation(db: Session, conversation_id: int, user_id: int) -> Conversation:
    conv = db.get(Conversation, conversation_id)
    if conv is None or not conv.has(user_id):
        raise ChatError(404, "Conversation not found")
    return conv


def send_message(db: Session, conv: Conversation, sender_id: int, text: str, client_id: str) -> tuple[Message, bool]:
    stmt = select(Message).where(Message.conversation_id == conv.id, Message.client_id == client_id)
    existing = db.scalar(stmt)
    if existing is not None:
        return existing, False
    if is_blocked(db, sender_id, conv.other(sender_id)):
        raise ChatError(403, "Messaging is blocked between these users")
    msg = Message(conversation_id=conv.id, sender_id=sender_id, text=text, client_id=client_id)
    db.add(msg)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return db.scalars(stmt).one(), False
    db.refresh(msg)
    return msg, True
