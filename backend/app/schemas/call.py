from pydantic import BaseModel


class CallTokenOut(BaseModel):
    api_key: str
    user_id: str
    token: str
