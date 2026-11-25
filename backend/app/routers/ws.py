import asyncio
from collections import defaultdict
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from app.db import SessionLocal
from app.models import User
from app.schemas.chat import MessageOut, WsAuth, WsSend
from app.services import chat_service
from app.services.auth_service import decode_user_id
from app.services.chat_service import ChatError

AUTH_TIMEOUT_SECONDS = 10

router = APIRouter()
connections: dict[int, set[WebSocket]] = defaultdict(set)


def _authenticate(token: str) -> int | None:
    user_id = decode_user_id(token)
    if user_id is None:
        return None
    with SessionLocal() as db:
        return user_id if db.get(User, user_id) is not None else None


def _send(user_id: int, body: WsSend) -> tuple[dict[str, Any], list[int], bool]:
    with SessionLocal() as db:
        conv = chat_service.participant_conversation(db, body.conversation_id, user_id)
        msg, created = chat_service.send_message(db, conv, user_id, body.text, body.client_id)
        return MessageOut.model_validate(msg).model_dump(mode="json"), [conv.user_a, conv.user_b], created


async def _broadcast(user_ids: list[int], payload: dict[str, Any]) -> None:
    for uid in user_ids:
        for ws in list(connections.get(uid, ())):
            try:
                await ws.send_json(payload)
            except Exception:
                connections[uid].discard(ws)


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    await ws.accept()
    try:
        first = await asyncio.wait_for(ws.receive_text(), AUTH_TIMEOUT_SECONDS)
        user_id = await run_in_threadpool(_authenticate, WsAuth.model_validate_json(first).token)
    except (asyncio.TimeoutError, ValidationError, WebSocketDisconnect):
        user_id = None
    if user_id is None:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    connections[user_id].add(ws)
    await ws.send_json({"type": "auth_ok", "user_id": user_id})
    try:
        while True:
            data = await ws.receive_text()
            try:
                body = WsSend.model_validate_json(data)
            except ValidationError:
                await ws.send_json({"type": "error", "detail": "Invalid message"})
                continue
            try:
                message, participants, created = await run_in_threadpool(_send, user_id, body)
            except ChatError as e:
                await ws.send_json({"type": "error", "client_id": body.client_id, "detail": e.detail})
                continue
            if created:
                await _broadcast(participants, {"type": "message", "message": message})
            await ws.send_json({"type": "ack", "client_id": body.client_id, "message_id": message["id"]})
    except WebSocketDisconnect:
        pass
    finally:
        connections[user_id].discard(ws)
        if not connections[user_id]:
            connections.pop(user_id, None)
