import os

SECRET_KEY = os.getenv("JWT_SECRET", "test")
REDIS_URL = os.getenv("REDIS_URL", "test")
POSTGRES_URL = os.getenv("POSTGRES_URL", "test")
