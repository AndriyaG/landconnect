import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = os.getenv("TEST_DATABASE_URL") or f"sqlite:///{os.path.join(_tmp, 'test.db')}"
os.environ["JWT_SECRET"] = "test-jwt-secret-0123456789abcdef0123456789"
os.environ["STREAM_API_KEY"] = "test-key"
os.environ["STREAM_API_SECRET"] = "test-stream-secret-0123456789abcdef01234"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.services import call_service  # noqa: E402


@pytest.fixture
def client():
    Base.metadata.drop_all(engine)
    with TestClient(app) as c:
        yield c


@pytest.fixture
def stream_calls(monkeypatch):
    upserted: list[str] = []
    monkeypatch.setattr(call_service, "upsert_user", lambda u: upserted.append(call_service.stream_user_id(u)))
    monkeypatch.setattr(call_service, "create_user_token", lambda u: f"stream-token-{u.id}")
    monkeypatch.setattr(call_service, "open_meeting_call", lambda *_a, **_k: None)
    monkeypatch.setattr(call_service, "create_ringing_call", lambda *_a, **_k: None)
    return upserted


def register(client, email="a@example.com", role="buyer", password="password123", name="Alice"):
    return client.post(
        "/auth/register", json={"name": name, "email": email, "password": password, "role": role}
    )


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
