from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.user import PublicUser


class ConversationIn(BaseModel):
    other_user_id: int
    listing_id: int


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    sender_id: int
    text: str
    client_id: str
    created_at: datetime


class ConversationOut(BaseModel):
    id: int
    listing_id: int
    other_user: PublicUser
    last_message: MessageOut | None = None


class BlockIn(BaseModel):
    user_id: int


class WsAuth(BaseModel):
    type: str = Field(pattern="^auth$")
    token: str


class WsSend(BaseModel):
    type: str = Field(pattern="^send$")
    conversation_id: int
    text: str = Field(min_length=1, max_length=4000)
    client_id: str = Field(min_length=1, max_length=64)

    @field_validator("text")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("text must not be blank")
        return v
