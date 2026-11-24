from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Role = Literal["buyer", "seller", "broker"]


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: Role


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class PublicUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    role: Role


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: PublicUser


class CallTokenOut(BaseModel):
    api_key: str
    user_id: str
    token: str
