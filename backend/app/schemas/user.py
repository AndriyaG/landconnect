from pydantic import BaseModel, ConfigDict, Field

from app.models import CallPrivacy, Role


class PublicUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    role: Role


class Me(PublicUser):
    email: str
    call_privacy: CallPrivacy


class MeUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=100)
    call_privacy: CallPrivacy | None = None
