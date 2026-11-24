from functools import lru_cache

from getstream import Stream
from getstream.models import UserRequest

from app.config import STREAM_API_KEY, STREAM_API_SECRET
from app.models import User

TOKEN_TTL_SECONDS = 24 * 3600


@lru_cache
def _client() -> Stream:
    if not STREAM_API_KEY or not STREAM_API_SECRET:
        raise RuntimeError("STREAM_API_KEY and STREAM_API_SECRET must be set")
    return Stream(api_key=STREAM_API_KEY, api_secret=STREAM_API_SECRET)


def stream_user_id(user: User) -> str:
    return str(user.id)


def upsert_user(user: User) -> None:
    _client().upsert_users(UserRequest(id=stream_user_id(user), name=user.name))


def create_user_token(user: User) -> str:
    return _client().create_token(stream_user_id(user), expiration=TOKEN_TTL_SECONDS)


def api_key() -> str:
    return STREAM_API_KEY
