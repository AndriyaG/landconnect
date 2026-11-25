from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class CallType(StrEnum):
    audio = "audio"
    video = "video"


class CallStatus(StrEnum):
    ringing = "ringing"
    accepted = "accepted"
    rejected = "rejected"
    ended = "ended"
    missed = "missed"


class CallLog(Base):
    __tablename__ = "call_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    call_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    caller_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    callee_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type: Mapped[CallType] = mapped_column(Enum(CallType, native_enum=False, length=20))
    status: Mapped[CallStatus] = mapped_column(
        Enum(CallStatus, native_enum=False, length=20), default=CallStatus.ringing
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
