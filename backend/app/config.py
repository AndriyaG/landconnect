import os

from dotenv import load_dotenv

load_dotenv()


def _database_url() -> str:
    url = os.environ["DATABASE_URL"]
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


DATABASE_URL = _database_url()
JWT_SECRET = os.environ["JWT_SECRET"]
ACCESS_TOKEN_EXPIRE_DAYS = 7
STREAM_API_KEY = os.getenv("STREAM_API_KEY", "")
STREAM_API_SECRET = os.getenv("STREAM_API_SECRET", "")
