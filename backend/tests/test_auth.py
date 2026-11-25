from datetime import datetime, timedelta, timezone

import jwt

from tests.conftest import register


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_register_returns_token_and_public_user(client):
    r = register(client, role="seller")
    assert r.status_code == 201
    body = r.json()
    assert body["access_token"]
    assert body["user"] == {"id": body["user"]["id"], "name": "Alice", "role": "seller"}


def test_register_hides_email_and_password(client):
    text = register(client).text
    assert "a@example.com" not in text
    assert "password" not in text


def test_register_duplicate_email_case_insensitive(client):
    register(client)
    assert register(client, email="A@Example.com").status_code == 409


def test_register_rejects_admin_role(client):
    assert register(client, role="admin").status_code == 422


def test_register_accepts_each_allowed_role(client):
    for i, role in enumerate(["buyer", "seller", "broker"]):
        assert register(client, email=f"u{i}@example.com", role=role).status_code == 201


def test_register_rejects_short_password(client):
    assert register(client, password="short").status_code == 422


def test_login_success(client):
    register(client)
    r = client.post("/auth/login", json={"email": "a@example.com", "password": "password123"})
    assert r.status_code == 200
    assert r.json()["user"]["name"] == "Alice"
    assert "a@example.com" not in r.text


def test_login_token_expires_in_7_days(client):
    register(client)
    token = client.post("/auth/login", json={"email": "a@example.com", "password": "password123"}).json()[
        "access_token"
    ]
    exp = jwt.decode(token, options={"verify_signature": False})["exp"]
    remaining = datetime.fromtimestamp(exp, timezone.utc) - datetime.now(timezone.utc)
    assert timedelta(days=6, hours=23) < remaining <= timedelta(days=7)


def test_login_wrong_password(client):
    register(client)
    r = client.post("/auth/login", json={"email": "a@example.com", "password": "wrongpass1"})
    assert r.status_code == 401


def test_login_unknown_email(client):
    r = client.post("/auth/login", json={"email": "nobody@example.com", "password": "password123"})
    assert r.status_code == 401
