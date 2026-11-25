from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.user import Me, MeUpdate, PublicUser

router = APIRouter(tags=["users"])


@router.get("/me", response_model=Me)
def get_me(user: User = Depends(get_current_user)) -> Me:
    return Me.model_validate(user)


@router.patch("/me", response_model=Me)
def update_me(body: MeUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Me:
    if body.name is not None:
        user.name = body.name.strip()
    if body.call_privacy is not None:
        user.call_privacy = body.call_privacy
    db.add(user)
    db.commit()
    return Me.model_validate(user)


@router.get("/users/{user_id}/public", response_model=PublicUser)
def get_public_user(user_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> PublicUser:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return PublicUser.model_validate(user)
