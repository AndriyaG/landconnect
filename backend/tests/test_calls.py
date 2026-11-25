import os

import jwt
import pytest

from app.services import call_service
from tests.conftest import auth, register


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


def _user(client, email, name=None, role="buyer"):
    body = register(client, email=email, name=name or email.split("@")[0], role=role).json()
    return body["access_token"], body["user"]["id"]


@pytest.fixture
def ringing(monkeypatch):
    made: list[dict] = []

    def fake(caller, callee, call_id, video):
        made.append({"caller": caller.id, "callee": callee.id, "call_id": call_id, "video": video})

    monkeypatch.setattr(call_service, "create_ringing_call", fake)
    return made


def _listing(client, token):
    return client.post(
        "/listings",
        json={
            "title": "Plot",
            "price": 100,
            "area_value": 1,
            "area_unit": "acre",
            "land_type": "farm",
            "lat": 12.9,
            "lng": 77.6,
        },
        headers=auth(token),
    ).json()["id"]


def test_start_rejects_block_either_way(client, ringing):
    caller, caller_id = _user(client, "caller@example.com", "Caller")
    callee, callee_id = _user(client, "callee@example.com", "Callee")
    blocked = client.post("/calls/start", json={"callee_id": callee_id, "type": "audio"}, headers=auth(caller))
    assert blocked.status_code == 200
    client.post("/blocks", json={"user_id": callee_id}, headers=auth(caller))
    again = client.post("/calls/start", json={"callee_id": callee_id, "type": "audio"}, headers=auth(caller))
    assert again.status_code == 403
    assert again.json()["detail"] == "blocked"
    reverse = client.post("/calls/start", json={"callee_id": caller_id, "type": "video"}, headers=auth(callee))
    assert reverse.status_code == 403
    assert reverse.json()["detail"] == "blocked"
    assert len(ringing) == 1


def test_start_rejects_contacts_privacy_without_conversation(client, ringing):
    caller, caller_id = _user(client, "caller@example.com", "Caller")
    callee, callee_id = _user(client, "callee@example.com", "Callee", role="seller")
    assert client.patch("/me", json={"call_privacy": "contacts"}, headers=auth(callee)).status_code == 200
    denied = client.post("/calls/start", json={"callee_id": callee_id, "type": "video"}, headers=auth(caller))
    assert denied.status_code == 403
    assert denied.json()["detail"] == "not accepting calls"
    listing_id = _listing(client, callee)
    client.post("/conversations", json={"other_user_id": callee_id, "listing_id": listing_id}, headers=auth(caller))
    allowed = client.post("/calls/start", json={"callee_id": callee_id, "type": "audio"}, headers=auth(caller))
    assert allowed.status_code == 200
    assert ringing[0]["video"] is False
    assert ringing[0]["caller"] == caller_id
    assert ringing[0]["callee"] == callee_id
    history = client.get("/calls/history", headers=auth(callee)).json()
    assert history[0]["call_id"] == allowed.json()["call_id"]
    assert history[0]["direction"] == "incoming"
    assert history[0]["other_user"] == {"id": caller_id, "name": "Caller", "role": "buyer"}
    assert "email" not in history[0]["other_user"]


def test_non_participant_cannot_update_call_status(client, ringing):
    caller, _caller_id = _user(client, "caller@example.com", "Caller")
    callee, callee_id = _user(client, "callee@example.com", "Callee")
    stranger, _stranger_id = _user(client, "stranger@example.com", "Stranger")
    started = client.post("/calls/start", json={"callee_id": callee_id, "type": "video"}, headers=auth(caller))
    assert started.status_code == 200
    call_id = started.json()["call_id"]
    denied = client.post(f"/calls/{call_id}/status", json={"status": "ended"}, headers=auth(stranger))
    assert denied.status_code == 403
    accepted = client.post(f"/calls/{call_id}/status", json={"status": "accepted"}, headers=auth(callee))
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "accepted"
    assert accepted.json()["ended_at"] is None
    ended = client.post(f"/calls/{call_id}/status", json={"status": "ended"}, headers=auth(caller))
    assert ended.status_code == 200
    assert ended.json()["status"] == "ended"
    assert ended.json()["ended_at"] is not None
    kept = client.post(f"/calls/{call_id}/status", json={"status": "missed"}, headers=auth(caller))
    assert kept.status_code == 200
    assert kept.json()["status"] == "ended"
    mine = client.get("/calls/history", headers=auth(caller)).json()
    assert mine[0]["status"] == "ended"
    assert mine[0]["direction"] == "outgoing"
    assert client.post(f"/calls/{call_id}/status", json={"status": "missed"}).status_code == 401
    assert client.get("/calls/history").status_code == 401


def test_meeting_call_is_opened_without_ringing(monkeypatch):
    seen: dict = {}

    class FakeCall:
        def get_or_create(self, **kwargs):
            seen.update(kwargs)

    class FakeVideo:
        def call(self, call_type, call_id):
            seen["call_type"] = call_type
            seen["call_id"] = call_id
            return FakeCall()

    class FakeClient:
        video = FakeVideo()

    monkeypatch.setattr(call_service, "_client", lambda: FakeClient())
    monkeypatch.setattr(call_service, "upsert_user", lambda _u: None)
    call_service.open_meeting_call("meeting-abc", 7, [7, 8])
    assert seen["ring"] is False
    assert seen["call_id"] == "meeting-abc"
    call_service.create_ringing_call(type("U", (), {"id": 1, "name": "A"})(), type("U", (), {"id": 2, "name": "B"})(), "cid", True)
    assert seen["ring"] is True


def test_real_stream_token_is_signed_for_user():
    class U:
        id = 42
        name = "Bob"

    token = call_service.create_user_token(U())
    claims = jwt.decode(token, os.environ["STREAM_API_SECRET"], algorithms=["HS256"])
    assert claims["user_id"] == "42"
    assert "exp" in claims
