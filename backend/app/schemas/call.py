from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.models import CallStatus, CallType
from app.schemas.user import PublicUser


class CallTokenOut(BaseModel):
    api_key: str
    user_id: str
    token: str


class CallStartIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    callee_id: int
    type: CallType


class CallStartOut(BaseModel):
    call_id: str


class CallStatusIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["accepted", "rejected", "ended", "missed"]


class CallHistoryOut(BaseModel):
    id: int
    call_id: str
    type: CallType
    status: CallStatus
    started_at: datetime
    ended_at: datetime | None
    direction: Literal["incoming", "outgoing"]
    other_user: PublicUser
