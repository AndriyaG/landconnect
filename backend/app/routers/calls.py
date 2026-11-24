from fastapi import APIRouter, Depends, HTTPException, status

from app.models import User
from app.schemas import CallTokenOut
from app.security import get_current_user
from app.services import call_service

router = APIRouter(prefix="/calls", tags=["calls"])


@router.post("/token", response_model=CallTokenOut)
def call_token(user: User = Depends(get_current_user)) -> CallTokenOut:
    try:
        call_service.upsert_user(user)
        token = call_service.create_user_token(user)
    except Exception:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Call service unavailable")
    return CallTokenOut(api_key=call_service.api_key(), user_id=call_service.stream_user_id(user), token=token)
