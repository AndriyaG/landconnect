from enum import StrEnum

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Role(StrEnum):
    buyer = "buyer"
    seller = "seller"
    broker = "broker"


class CallPrivacy(StrEnum):
    everyone = "everyone"
    contacts = "contacts"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(Enum(Role, native_enum=False, length=20))
    call_privacy: Mapped[CallPrivacy] = mapped_column(
        Enum(CallPrivacy, native_enum=False, length=20),
        default=CallPrivacy.everyone,
        server_default=CallPrivacy.everyone.value,
    )
