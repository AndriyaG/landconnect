from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Block, User
from app.schemas.chat import BlockIn
from app.schemas.user import PublicUser

router = APIRouter(prefix="/blocks", tags=["blocks"])


@router.post("", response_model=PublicUser, status_code=status.HTTP_201_CREATED)
def block_user(body: BlockIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> PublicUser:
    if body.user_id == user.id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Cannot block yourself")
    target = db.get(User, body.user_id)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if db.get(Block, (user.id, target.id)) is None:
        db.add(Block(blocker_id=user.id, blocked_id=target.id))
        db.commit()
    return PublicUser.model_validate(target)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def unblock_user(user_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> None:
    block = db.get(Block, (user.id, user_id))
    if block is not None:
        db.delete(block)
        db.commit()


@router.get("", response_model=list[PublicUser])
def list_blocks(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[PublicUser]:
    stmt = (
        select(User).join(Block, Block.blocked_id == User.id).where(Block.blocker_id == user.id).order_by(User.name)
    )
    return [PublicUser.model_validate(u) for u in db.scalars(stmt)]
