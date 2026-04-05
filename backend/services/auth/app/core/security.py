from datetime import datetime, timedelta, timezone
from typing import Any
from jose import jwt
from passlib.context import CryptContext
import httpx
import hashlib
from datetime import timedelta
from typing import Any
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def check_pwned_password(password: str) -> bool:
    """
    Check if a password has been leaked using Have I Been Pwned API (k-anonymity).
    Returns True if the password is pwned, False otherwise.
    """
    password_bytes = password.encode("utf-8")
    sha1_hash = hashlib.sha1(password_bytes).hexdigest().upper()
    prefix = sha1_hash[:5]
    suffix = sha1_hash[5:]
    
    url = f"https://api.pwnedpasswords.com/range/{prefix}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=5.0)
            if response.status_code != 200:
                return False # Fail safe: don't block user if API is down
        except Exception:
            return False

    for line in response.text.splitlines():
        if line.startswith(suffix):
            # Format is SUFFIX:COUNT
            return True
    return False

ALGORITHM = "HS256"

def create_access_token(subject: str | Any, jti: str | None = None, expires_delta: timedelta | None = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.SESSION_TOKEN_TTL_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    if jti:
        to_encode["jti"] = jti
        
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: str | Any, jti: str | None = None, expires_delta: timedelta | None = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)
        
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    if jti:
        to_encode["jti"] = jti
        
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str, expected_type: str | None = None) -> dict[str, Any]:
    """
    Decodes a JWT token and returns the payload.
    Raises jwt.ExpiredSignatureError or jwt.JWTError on failure.
    """
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    if expected_type and payload.get("type") != expected_type:
        from jose import JWTError
        raise JWTError("Invalid token type")
    return payload

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

