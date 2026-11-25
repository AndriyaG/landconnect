from sqlalchemy import inspect, text

from app.db import Base, engine, init_db


def test_init_db_adds_call_privacy_to_existing_users_table():
    Base.metadata.drop_all(engine)
    with engine.begin() as conn:
        conn.execute(text(
            "CREATE TABLE users (id INTEGER PRIMARY KEY, name VARCHAR(100), email VARCHAR(255), "
            "password_hash VARCHAR(255), role VARCHAR(20))"
        ))
        conn.execute(text("INSERT INTO users VALUES (1, 'Old', 'old@example.com', 'x', 'buyer')"))
    init_db()
    assert "call_privacy" in {c["name"] for c in inspect(engine).get_columns("users")}
    with engine.connect() as conn:
        assert conn.execute(text("SELECT call_privacy FROM users WHERE id = 1")).scalar() == "everyone"
