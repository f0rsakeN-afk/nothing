import uuid
from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user
from app.repositories.user_repository import UserRepository
from app.repositories.verification_repository import VerificationTokenRepository
from app.services.auth_service import AuthService
from app.services.email import EmailService
from app.schemas.auth import UserRegister, UserLogin, UserResponse, ForgotPasswordRequest, ResetPasswordRequest
from app.models.user import User
from app.exceptions.auth_exceptions import TokenInvalid
from app.core.limiter import limiter

from app.repositories.session_repository import SessionRepository
from app.schemas.auth import UserRegister, UserLogin, UserResponse, ForgotPasswordRequest, ResetPasswordRequest, UpdatePasswordRequest, UserSessionRead, GoogleLoginRequest

router = APIRouter(prefix="/auth", tags=["auth"])

async def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(
        UserRepository(db),
        VerificationTokenRepository(db),
        SessionRepository(db),
        EmailService(),
    )

@router.post("/register", response_model=UserResponse)
@limiter.limit("5/minute")
async def register(
    request: Request,
    user_in: UserRegister,
    auth_service: AuthService = Depends(get_auth_service),
):
    return await auth_service.register(user_in)

@router.post("/login")
@limiter.limit("5/minute")
async def login(
    request: Request,
    response: Response,
    login_in: UserLogin,
    auth_service: AuthService = Depends(get_auth_service),
):
    user_agent = request.headers.get("User-Agent")
    ip_address = request.client.host if request.client else None
    user = await auth_service.login(login_in, response, ip_address=ip_address, user_agent=user_agent)
    return {"msg": "Successfully logged in", "user_id": str(user.id)}

@router.post("/google")
@limiter.limit("5/minute")
async def google_login(
    request: Request,
    response: Response,
    google_in: GoogleLoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    user = await auth_service.authenticate_google(google_in.id_token)
    
    # Standard login success logic (tokens/sessions)
    # Since authenticate_google only returns the user, we need to create the session here 
    # OR move the session creation logic into a shared method in AuthService.
    # Actually, AuthService.login does a lot of work. I'll create a shared method 'create_session_and_tokens'.
    # Wait, I'll just call a new method in AuthService.
    
    user_agent = request.headers.get("User-Agent")
    ip_address = request.client.host if request.client else None
    
    # We'll need a way to log in the user without password for Google
    # I'll add a method 'login_social' to AuthService.
    
    user = await auth_service.login_social(user, response, ip_address=ip_address, user_agent=user_agent)
    return {"msg": "Successfully logged in with Google", "user_id": str(user.id)}

@router.get("/verify-email")
async def verify_email(
    token: str,
    auth_service: AuthService = Depends(get_auth_service),
):
    success = await auth_service.verify_email(token)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    return {"msg": "Email verified successfully"}

@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    email_in: ForgotPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    await auth_service.request_password_reset(email_in.email)
    return {"msg": "If the email exists, a reset link has been sent"}

@router.post("/reset-password")
@limiter.limit("3/minute")
async def reset_password(
    request: Request,
    reset_in: ResetPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    await auth_service.reset_password(reset_in)
    return {"msg": "Password has been reset successfully"}

@router.post("/refresh", response_model=UserResponse)
async def refresh_token(
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise TokenInvalid()
    return await auth_service.refresh_session(refresh_token, response)

@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    # jti is injected into request.state by get_current_user dependency
    jti = getattr(request.state, "jti", None)
    await auth_service.logout(response, jti=jti)
    return {"msg": "Successfully logged out"}

@router.get("/sessions", response_model=list[UserSessionRead])
async def get_sessions(
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    return await auth_service.get_active_sessions(current_user.id)

@router.post("/sessions/revoke/{session_id}")
async def revoke_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    success = await auth_service.revoke_session(session_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"msg": "Session revoked"}

@router.post("/sessions/revoke-all")
async def revoke_all_sessions(
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    await auth_service.revoke_all_sessions(current_user.id)
    return {"msg": "All other sessions revoked"}

@router.post("/update-password")
async def update_password(
    update_in: UpdatePasswordRequest,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    await auth_service.update_password(current_user, update_in)
    return {"msg": "Password updated successfully"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/health", tags=["System"])
async def health_check() -> dict[str, str]:
    """
    Service health check endpoint.
    """
    from app.core.config import settings
    return {
        "status": "active",
        "app": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0"
    }
