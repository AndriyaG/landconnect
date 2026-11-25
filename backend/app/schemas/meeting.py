from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas.user import PublicUser


class MeetingIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    scheduled_at: datetime
    invitee_ids: list[int] = Field(default_factory=list, max_length=50)

    @field_validator("title")
    @classmethod
    def not_blank(cls, v: str) -> str:
        title = v.strip()
        if not title:
            raise ValueError("title must not be blank")
        return title


class MeetingOut(BaseModel):
    id: int
    title: str
    host: PublicUser
    call_id: str
    scheduled_at: datetime
    participants: list[PublicUser]


class MeetingJoinOut(BaseModel):
    call_id: str
    api_key: str
    user_id: str
    token: str
