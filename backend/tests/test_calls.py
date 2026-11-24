import os

import jwt

from app.services import call_service
from tests.conftest import register


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_call_token_requires_auth(client, stream_calls):
    assert client.post("/calls/token").status_code == 401


def test_call_token_rejects_invalid_jwt(client, stream_calls):
    assert client.post("/calls/token", headers=_auth("not-a-jwt")).status_code == 401


def test_call_token_upserts_user_and_returns_token(client, stream_calls):
    body = register(client).json()
    user_id = str(body["user"]["id"])
    r = client.post("/calls/token", headers=_auth(body["access_token"]))
    assert r.status_code == 200
    assert r.json() == {"api_key": "test-key", "user_id": user_id, "token": f"stream-token-{user_id}"}
    assert stream_calls == [user_id]


def test_call_token_stream_failure_returns_502(client, monkeypatch):
    def boom(_):
        raise RuntimeError("down")

    monkeypatch.setattr(call_service, "upsert_user", boom)
    token = register(client).json()["access_token"]
    assert client.post("/calls/token", headers=_auth(token)).status_code == 502


def test_real_stream_token_is_signed_for_user():
    class U:
        id = 42
        name = "Bob"

    token = call_service.create_user_token(U())
    claims = jwt.decode(token, os.environ["STREAM_API_SECRET"], algorithms=["HS256"])
    assert claims["user_id"] == "42"
    assert "exp" in claims
