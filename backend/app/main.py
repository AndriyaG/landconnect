from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import models  # noqa: F401
from app.db import init_db
from app.routers import auth, calls, users


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="LandConnect API", lifespan=lifespan)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(calls.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
