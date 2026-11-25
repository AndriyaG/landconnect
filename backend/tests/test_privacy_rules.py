import re
from typing import Union, get_args, get_origin

import pytest
from fastapi.routing import APIRoute, APIWebSocketRoute
from pydantic import BaseModel
from starlette.websockets import WebSocketDisconnect

from app.deps import get_current_user
from app.main import app
from app.schemas.user import Me, PublicUser
from tests.conftest import auth, register

# Catalog reads, health, and login stay open. Every other HTTP route depends on the current user.
OPEN = {
    ("GET", "/health"),
    ("POST", "/auth/register"),
    ("POST", "/auth/login"),
    ("GET", "/listings"),
    ("GET", "/listings/{listing_id}"),
    ("GET", "/images/{image_id}"),
}

LISTING = {
    "title": "Plot",
    "price": 100,
    "area_value": 1,
    "area_unit": "acre",
    "land_type": "farm",
    "lat": 12.9,
    "lng": 77.6,
}

SECRET_FIELDS = {"email", "phone", "password", "password_hash"}


def _uses_current_user(dependant) -> bool:
    for sub in dependant.dependencies:
        if sub.call is get_current_user or _uses_current_user(sub):
            return True
    return False


def _walk_models(annotation, seen: set[type]):
    origin = get_origin(annotation)
    if origin is Union or origin is list or origin is tuple:
        for arg in get_args(annotation):
            yield from _walk_models(arg, seen)
        return
    if origin is not None:
        for arg in get_args(annotation):
            yield from _walk_models(arg, seen)
        return
    if isinstance(annotation, type) and issubclass(annotation, BaseModel) and annotation not in seen:
        seen.add(annotation)
        yield annotation
        for field in annotation.model_fields.values():
            yield from _walk_models(field.annotation, seen)


def _pair(client, seller_email="seller@example.com", buyer_email="buyer@example.com"):
    seller = register(client, email=seller_email, role="seller", name="Seller").json()
    buyer = register(client, email=buyer_email, role="buyer", name="Buyer").json()
    listing_id = client.post("/listings", json=LISTING, headers=auth(seller["access_token"])).json()["id"]
    return seller, buyer, listing_id


def _connect(client, token):
    ws = client.websocket_connect("/ws")
    conn = ws.__enter__()
    conn.send_json({"type": "auth", "token": token})
    assert conn.receive_json()["type"] == "auth_ok"
    return ws, conn


def _iter_routes(routes):
    for route in routes:
        nested = getattr(route, "original_router", None)
        if nested is not None:
            yield from _iter_routes(nested.routes)
        else:
            yield route


def test_every_route_has_an_auth_dependency(client):
    secured, open_routes = [], []
    ws_paths = []
    for route in _iter_routes(app.routes):
        if isinstance(route, APIWebSocketRoute):
            ws_paths.append(route.path)
            continue
        if not isinstance(route, APIRoute):
            continue
        for method in sorted(route.methods - {"HEAD", "OPTIONS"}):
            key = (method, route.path)
            (secured if _uses_current_user(route.dependant) else open_routes).append(key)
    assert ws_paths == ["/ws"]
    assert set(open_routes) == OPEN
    assert secured
    for _method, path in secured:
        if _method != "GET":
            continue
        url = re.sub(r"\{[^}]+\}", "1", path)
        assert client.get(url).status_code == 401, path
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"type": "auth", "token": "nope"})
        with pytest.raises(WebSocketDisconnect) as exc:
            ws.receive_json()
        assert exc.value.code == 1008


def test_role_check_rejects_buyer_listing(client):
    buyer = register(client, email="buyer@example.com", role="buyer").json()["access_token"]
    seller = register(client, email="seller@example.com", role="seller").json()["access_token"]
    assert client.post("/listings", json=LISTING, headers=auth(buyer)).status_code == 403
    assert client.post("/listings", json=LISTING, headers=auth(seller)).status_code == 201


def test_owner_check_rejects_other_seller(client):
    owner = register(client, email="owner@example.com", role="seller", name="Owner").json()["access_token"]
    other = register(client, email="other@example.com", role="broker", name="Other").json()["access_token"]
    created = client.post("/listings", json=LISTING, headers=auth(owner))
    assert created.status_code == 201
    listing_id = created.json()["id"]
    changed = {**LISTING, "title": "Taken over", "status": "active"}
    assert client.put(f"/listings/{listing_id}", json=changed, headers=auth(other)).status_code == 403
    assert client.delete(f"/listings/{listing_id}", headers=auth(other)).status_code == 403
    assert client.get(f"/listings/{listing_id}").json()["title"] == "Plot"
    assert client.put(f"/listings/{listing_id}", json=changed, headers=auth(owner)).status_code == 200


def test_response_schemas_hide_email_phone_and_password_hash():
    seen: set[type] = set()
    leaked = []
    for route in _iter_routes(app.routes):
        for model in _walk_models(getattr(route, "response_model", None), seen):
            for name, field in model.model_fields.items():
                exposed = {name, field.alias, field.serialization_alias}
                if model is Me:
                    exposed.discard("email")
                hit = exposed & SECRET_FIELDS
                if hit:
                    leaked.append(f"{model.__name__}.{sorted(hit)}")
    assert leaked == []
    assert Me in seen and PublicUser in seen
    assert set(PublicUser.model_fields) == {"id", "name", "role"}
    assert "password_hash" not in str(app.openapi())


def test_block_prevents_new_conversation(client):
    seller, buyer, listing_id = _pair(client)

    def create(token, other_id):
        return client.post(
            "/conversations", json={"other_user_id": other_id, "listing_id": listing_id}, headers=auth(token)
        )

    client.post("/blocks", json={"user_id": seller["user"]["id"]}, headers=auth(buyer["access_token"]))
    assert create(buyer["access_token"], seller["user"]["id"]).status_code == 403
    client.delete(f"/blocks/{seller['user']['id']}", headers=auth(buyer["access_token"]))
    client.post("/blocks", json={"user_id": buyer["user"]["id"]}, headers=auth(seller["access_token"]))
    denied = create(buyer["access_token"], seller["user"]["id"])
    assert denied.status_code == 403
    assert denied.json()["detail"] == "Messaging is blocked between these users"
    client.delete(f"/blocks/{buyer['user']['id']}", headers=auth(seller["access_token"]))
    assert create(buyer["access_token"], seller["user"]["id"]).status_code == 200


def test_block_prevents_messages(client):
    seller, buyer, listing_id = _pair(client)
    conv_id = client.post(
        "/conversations",
        json={"other_user_id": seller["user"]["id"], "listing_id": listing_id},
        headers=auth(buyer["access_token"]),
    ).json()["id"]

    def attempt(client_id):
        ws, conn = _connect(client, buyer["access_token"])
        try:
            conn.send_json({"type": "send", "conversation_id": conv_id, "text": "hello", "client_id": client_id})
            return conn.receive_json()["type"]
        finally:
            ws.__exit__(None, None, None)

    client.post("/blocks", json={"user_id": buyer["user"]["id"]}, headers=auth(seller["access_token"]))
    assert attempt("m1") == "error"
    client.delete(f"/blocks/{buyer['user']['id']}", headers=auth(seller["access_token"]))
    client.post("/blocks", json={"user_id": seller["user"]["id"]}, headers=auth(buyer["access_token"]))
    assert attempt("m2") == "error"
    assert client.get(f"/conversations/{conv_id}/messages", headers=auth(buyer["access_token"])).json() == []


def test_block_prevents_calls(client, stream_calls):
    seller, buyer, _listing_id = _pair(client)
    caller, callee_id = buyer["access_token"], seller["user"]["id"]
    client.post("/blocks", json={"user_id": callee_id}, headers=auth(caller))
    denied = client.post("/calls/start", json={"callee_id": callee_id, "type": "audio"}, headers=auth(caller))
    assert denied.status_code == 403 and denied.json()["detail"] == "blocked"
    client.delete(f"/blocks/{callee_id}", headers=auth(caller))
    client.post("/blocks", json={"user_id": buyer["user"]["id"]}, headers=auth(seller["access_token"]))
    reverse = client.post("/calls/start", json={"callee_id": callee_id, "type": "video"}, headers=auth(caller))
    assert reverse.status_code == 403 and reverse.json()["detail"] == "blocked"
    assert stream_calls == []
    assert client.get("/calls/history", headers=auth(caller)).json() == []


def test_block_prevents_meeting_invites(client):
    seller, buyer, _listing_id = _pair(client)
    host, guest_id = seller["access_token"], buyer["user"]["id"]
    body = {"title": "Site visit", "scheduled_at": "2026-12-01T10:00:00Z", "invitee_ids": [guest_id]}
    client.post("/blocks", json={"user_id": guest_id}, headers=auth(host))
    denied = client.post("/meetings", json=body, headers=auth(host))
    assert denied.status_code == 403 and denied.json()["detail"] == "blocked"
    client.delete(f"/blocks/{guest_id}", headers=auth(host))
    client.post("/blocks", json={"user_id": seller["user"]["id"]}, headers=auth(buyer["access_token"]))
    reverse = client.post("/meetings", json=body, headers=auth(host))
    assert reverse.status_code == 403 and reverse.json()["detail"] == "blocked"
    assert client.get("/meetings", headers=auth(host)).json() == []
    client.delete(f"/blocks/{seller['user']['id']}", headers=auth(buyer["access_token"]))
    created = client.post("/meetings", json=body, headers=auth(host))
    assert created.status_code == 201
    assert "email" not in created.json()["host"]


def test_phone_numbers_are_masked_in_messages(client):
    seller, buyer, listing_id = _pair(client)
    conv_id = client.post(
        "/conversations",
        json={"other_user_id": seller["user"]["id"], "listing_id": listing_id},
        headers=auth(buyer["access_token"]),
    ).json()["id"]
    ws, conn = _connect(client, buyer["access_token"])
    try:
        conn.send_json(
            {
                "type": "send",
                "conversation_id": conv_id,
                "text": "Call me on 9876543210 or +91 98765 43210",
                "client_id": "phone",
            }
        )
        event = conn.receive_json()
        assert conn.receive_json()["type"] == "ack"
    finally:
        ws.__exit__(None, None, None)
    stored = event["message"]["text"]
    assert event["type"] == "message"
    assert "9876543210" not in stored and "98765" not in stored
    assert "••••••••10" in stored
    assert "+•• ••••• •••10" in stored
    listed = client.get(f"/conversations/{conv_id}/messages", headers=auth(seller["access_token"])).json()
    assert listed[0]["text"] == stored
