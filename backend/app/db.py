from collections.abc import Iterator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import DATABASE_URL

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    Base.metadata.create_all(engine)
    columns = {c["name"] for c in inspect(engine).get_columns("users")}
    if "call_privacy" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN call_privacy VARCHAR(20) NOT NULL DEFAULT 'everyone'"))


def get_db() -> Iterator[Session]:
    with SessionLocal() as db:
        yield db
