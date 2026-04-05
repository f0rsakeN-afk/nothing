from datetime import datetime, timezone
from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core import security
from app.core.database import get_db
from typing import List, Any
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.repositories.session_repository import SessionRepository

async def get_current_user(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    token = request.cookies.get("access_token")
    if not token:
        # Check Authorization header as fallback if needed for mobile/API
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
            )

    try:
        payload = security.decode_token(token, expected_type="access")
        user_id = payload.get("sub")
        jti = payload.get("jti")
        
        if not user_id or not jti:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims",
            )
            
        session_repo = SessionRepository(db)
        session = await session_repo.get_by_jti(jti)
        
        if not session or session.is_revoked or session.expires_at < datetime.now(timezone.utc):
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been revoked or expired",
            )
            
        # Store JTI in request state for logout usage
        request.state.jti = jti
        
    except Exception as e:
        # Better to be generic here to not leak details, but for internal use, log it
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalid or expired",
        )

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    # Inject user info into request state for easy access in endpoints
    request.state.user_id = str(user.id)
    request.state.user = user
    request.state.jti = jti

    # Identity Propagation for Microservices
    response.headers["X-User-ID"] = str(user.id)

    return user

class RoleChecker:
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return current_user
