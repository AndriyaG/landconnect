from tests.conftest import auth, register


def _user(client, email):
    body = register(client, email=email, name=email.split("@")[0]).json()
    return body["access_token"], body["user"]["id"]


def test_non_participant_cannot_join_meeting(client, stream_calls):
    host, host_id = _user(client, "host@example.com")
    guest, guest_id = _user(client, "guest@example.com")
    stranger, _stranger_id = _user(client, "stranger@example.com")
    created = client.post(
        "/meetings",
        json={"title": "Site visit", "scheduled_at": "2026-12-01T10:00:00Z", "invitee_ids": [guest_id]},
        headers=auth(host),
    )
    assert created.status_code == 201
    meeting = created.json()
    assert meeting["host"] == {"id": host_id, "name": "host", "role": "buyer"}
    assert {p["id"] for p in meeting["participants"]} == {host_id, guest_id}
    assert "email" not in meeting["host"]
    assert all("email" not in p for p in meeting["participants"])

    denied = client.post(f"/meetings/{meeting['id']}/join", headers=auth(stranger))
    assert denied.status_code == 403
    assert client.get("/meetings", headers=auth(stranger)).json() == []

    joined = client.post(f"/meetings/{meeting['id']}/join", headers=auth(guest))
    assert joined.status_code == 200
    assert joined.json()["call_id"] == meeting["call_id"]
    assert joined.json()["user_id"] == str(guest_id)
    assert set(stream_calls) == {str(guest_id), str(host_id)}

    mine = client.get("/meetings", headers=auth(host)).json()
    assert [m["id"] for m in mine] == [meeting["id"]]
    assert client.post(f"/meetings/{meeting['id']}/join").status_code == 401
    assert client.post("/meetings/9999/join", headers=auth(host)).status_code == 404


def test_meeting_create_validation(client):
    host, host_id = _user(client, "host@example.com")
    body = {"title": "Visit", "scheduled_at": "2026-12-01T10:00:00Z", "invitee_ids": [host_id]}
    assert client.post("/meetings", json=body, headers=auth(host)).status_code == 422
    missing = {**body, "invitee_ids": [9999]}
    assert client.post("/meetings", json=missing, headers=auth(host)).status_code == 404
    assert client.post("/meetings", json=body).status_code == 401
    assert client.get("/meetings").status_code == 401
