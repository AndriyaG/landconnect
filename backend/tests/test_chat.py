import pytest
from starlette.websockets import WebSocketDisconnect

from tests.conftest import auth, register


def _user(client, email, role="buyer"):
    body = register(client, email=email, role=role, name=email.split("@")[0]).json()
    return body["access_token"], body["user"]["id"]


@pytest.fixture
def setup(client):
    seller, seller_id = _user(client, "seller@example.com", "seller")
    buyer, buyer_id = _user(client, "buyer@example.com")
    other, other_id = _user(client, "other@example.com")
    listing = client.post(
        "/listings",
        json={"title": "Plot", "price": 100, "area_value": 1, "area_unit": "acre", "land_type": "farm",
              "lat": 12.9, "lng": 77.6},
        headers=auth(seller),
    ).json()
    conv = client.post(
        "/conversations", json={"other_user_id": seller_id, "listing_id": listing["id"]}, headers=auth(buyer)
    ).json()
    return {
        "seller": seller, "seller_id": seller_id, "buyer": buyer, "buyer_id": buyer_id,
        "other": other, "other_id": other_id, "listing_id": listing["id"], "conv_id": conv["id"],
    }


def _connect(client, token):
    ws = client.websocket_connect("/ws")
    conn = ws.__enter__()
    conn.send_json({"type": "auth", "token": token})
    assert conn.receive_json()["type"] == "auth_ok"
    return ws, conn


def _send(conn, conv_id, client_id, text="hello"):
    conn.send_json({"type": "send", "conversation_id": conv_id, "text": text, "client_id": client_id})


def _messages(client, token, conv_id):
    return client.get(f"/conversations/{conv_id}/messages", headers=auth(token))


def test_conversation_creation_is_idempotent_and_normalized(client, setup):
    s = setup
    again = client.post(
        "/conversations", json={"other_user_id": s["seller_id"], "listing_id": s["listing_id"]}, headers=auth(s["buyer"])
    )
    reverse = client.post(
        "/conversations", json={"other_user_id": s["buyer_id"], "listing_id": s["listing_id"]}, headers=auth(s["seller"])
    )
    assert again.status_code == reverse.status_code == 200
    assert again.json()["id"] == reverse.json()["id"] == s["conv_id"]
    assert again.json()["other_user"] == {"id": s["seller_id"], "name": "seller", "role": "seller"}
    assert reverse.json()["other_user"] == {"id": s["buyer_id"], "name": "buyer", "role": "buyer"}
    assert len(client.get("/conversations", headers=auth(s["buyer"])).json()) == 1


def test_conversation_validation(client, setup):
    s = setup
    post = lambda body: client.post("/conversations", json=body, headers=auth(s["buyer"]))  # noqa: E731
    assert post({"other_user_id": s["buyer_id"], "listing_id": s["listing_id"]}).status_code == 422
    assert post({"other_user_id": 9999, "listing_id": s["listing_id"]}).status_code == 404
    assert post({"other_user_id": s["seller_id"], "listing_id": 9999}).status_code == 404
    assert client.post("/conversations", json={"other_user_id": s["seller_id"], "listing_id": 1}).status_code == 401


def test_send_broadcasts_and_lists_last_message(client, setup):
    s = setup
    ws_b, buyer = _connect(client, s["buyer"])
    ws_s, seller = _connect(client, s["seller"])
    try:
        _send(buyer, s["conv_id"], "c1", "is it available?")
        msg = buyer.receive_json()
        assert msg["type"] == "message" and msg["message"]["text"] == "is it available?"
        assert buyer.receive_json() == {"type": "ack", "client_id": "c1", "message_id": msg["message"]["id"]}
        assert seller.receive_json() == msg
    finally:
        ws_b.__exit__(None, None, None)
        ws_s.__exit__(None, None, None)
    convs = client.get("/conversations", headers=auth(s["seller"])).json()
    assert convs[0]["last_message"]["text"] == "is it available?"
    assert "email" not in convs[0]["other_user"]


def test_duplicate_client_id_is_ignored(client, setup):
    s = setup
    ws, buyer = _connect(client, s["buyer"])
    try:
        _send(buyer, s["conv_id"], "dup", "first")
        first = buyer.receive_json()
        assert first["type"] == "message"
        assert buyer.receive_json()["type"] == "ack"
        _send(buyer, s["conv_id"], "dup", "second")
        assert buyer.receive_json() == {"type": "ack", "client_id": "dup", "message_id": first["message"]["id"]}
    finally:
        ws.__exit__(None, None, None)
    msgs = _messages(client, s["buyer"], s["conv_id"]).json()
    assert [m["text"] for m in msgs] == ["first"]


def test_non_participant_cannot_read_or_send(client, setup):
    s = setup
    assert _messages(client, s["other"], s["conv_id"]).status_code == 404
    ws, other = _connect(client, s["other"])
    try:
        _send(other, s["conv_id"], "x1")
        reply = other.receive_json()
        assert reply["type"] == "error" and reply["client_id"] == "x1"
    finally:
        ws.__exit__(None, None, None)
    assert _messages(client, s["buyer"], s["conv_id"]).json() == []


@pytest.mark.parametrize("blocker", ["buyer", "seller"])
def test_blocked_users_are_rejected(client, setup, blocker):
    s = setup
    target_id = s["seller_id"] if blocker == "buyer" else s["buyer_id"]
    assert client.post("/blocks", json={"user_id": target_id}, headers=auth(s[blocker])).status_code == 201
    assert [u["id"] for u in client.get("/blocks", headers=auth(s[blocker])).json()] == [target_id]

    ws, buyer = _connect(client, s["buyer"])
    try:
        _send(buyer, s["conv_id"], "b1")
        assert buyer.receive_json()["type"] == "error"
    finally:
        ws.__exit__(None, None, None)
    assert _messages(client, s["buyer"], s["conv_id"]).json() == []
    reopen = client.post(
        "/conversations", json={"other_user_id": s["seller_id"], "listing_id": s["listing_id"]}, headers=auth(s["buyer"])
    )
    assert reopen.status_code == 403

    assert client.delete(f"/blocks/{target_id}", headers=auth(s[blocker])).status_code == 204
    assert client.get("/blocks", headers=auth(s[blocker])).json() == []
    ws, buyer = _connect(client, s["buyer"])
    try:
        _send(buyer, s["conv_id"], "b2")
        assert buyer.receive_json()["type"] == "message"
    finally:
        ws.__exit__(None, None, None)


def test_block_validation(client, setup):
    s = setup
    assert client.post("/blocks", json={"user_id": s["buyer_id"]}, headers=auth(s["buyer"])).status_code == 422
    assert client.post("/blocks", json={"user_id": 9999}, headers=auth(s["buyer"])).status_code == 404
    assert client.get("/blocks").status_code == 401


def test_messages_pagination(client, setup):
    s = setup
    ws, buyer = _connect(client, s["buyer"])
    try:
        for i in range(5):
            _send(buyer, s["conv_id"], f"p{i}", f"m{i}")
            buyer.receive_json()
            buyer.receive_json()
    finally:
        ws.__exit__(None, None, None)
    page1 = client.get(f"/conversations/{s['conv_id']}/messages?limit=2", headers=auth(s["seller"])).json()
    assert [m["text"] for m in page1] == ["m4", "m3"]
    page2 = client.get(
        f"/conversations/{s['conv_id']}/messages?limit=2&before={page1[-1]['id']}", headers=auth(s["seller"])
    ).json()
    assert [m["text"] for m in page2] == ["m2", "m1"]


@pytest.mark.parametrize("first", [{"type": "auth", "token": "bad"}, {"type": "send", "conversation_id": 1}])
def test_ws_requires_auth_first(client, setup, first):
    with client.websocket_connect("/ws") as ws:
        ws.send_json(first)
        with pytest.raises(WebSocketDisconnect) as exc:
            ws.receive_json()
        assert exc.value.code == 1008
