import secrets
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
import httpx
from typing import Any
from sqlalchemy import select
from fastapi import Response, HTTPException, status
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.models.verification import VerificationToken
from app.models.session import UserSession
from app.repositories.user_repository import UserRepository
from app.repositories.verification_repository import VerificationTokenRepository
from app.models.login_attempt import LoginAttempt
from app.repositories.session_repository import SessionRepository
from app.services.email import EmailService
from app.schemas.auth import UserRegister, UserLogin, ForgotPasswordRequest, ResetPasswordRequest, UpdatePasswordRequest
from app.exceptions.auth_exceptions import UserAlreadyExists, InvalidCredentials, EmailNotVerified, TokenExpired, TokenInvalid, AccountLocked, InvalidPassword

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(
        self,
        user_repo: UserRepository,
        verification_repo: VerificationTokenRepository,
        session_repo: SessionRepository,
        email_service: EmailService,
    ):
        self.user_repo = user_repo
        self.verification_repo = verification_repo
        self.session_repo = session_repo
        self.email_service = email_service

    async def register(self, user_in: UserRegister) -> User:
        email = user_in.email.lower()
        # Check if email exists
        if await self.user_repo.get_by_email(email):
            raise UserAlreadyExists(email)

        # Compromised Password Check
        if await security.check_pwned_password(user_in.password.get_secret_value()):
            raise InvalidPassword("This password has been leaked in a data breach. Please choose a different one.")

        # Create user
        user = User(
            email=email,
            hashed_password=security.get_password_hash(user_in.password.get_secret_value()),
            full_name=user_in.full_name.strip(),
        )
        user = await self.user_repo.create(user)
        await self.user_repo.db.flush() # Ensure ID is generated

        # Create verification token
        token = secrets.token_urlsafe(32)
        verification_token = VerificationToken(
            user_id=user.id,
            token=token,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.EMAIL_VERIFICATION_TTL_HOURS),
        )
        await self.verification_repo.create(verification_token)

        # Commit all (user + token)
        await self.user_repo.db.commit()
        await self.user_repo.db.refresh(user)

        # Send email
        await self.email_service.send_verification_email(user.email, token)
        
        return user

    async def login(self, login_in: UserLogin, response: Response, ip_address: str | None = None, user_agent: str | None = None) -> User:
        logger.info("Login attempt for email: %s [IP: %s, UA: %s]", login_in.email, ip_address, user_agent)
        
        now = datetime.now(timezone.utc)
        
        # 1. IP-Based Proactive Blocking
        ip_attempt = None
        if ip_address:
            query = select(LoginAttempt).where(LoginAttempt.ip_address == ip_address)
            result = await self.user_repo.db.execute(query)
            ip_attempt = result.scalar_one_or_none()

            if ip_attempt and ip_attempt.blocked_until and ip_attempt.blocked_until > now:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many failed attempts from this IP. Blocked until {ip_attempt.blocked_until.strftime('%H:%M:%S UTC')}."
                )

        user = await self.user_repo.get_by_email(login_in.email)
        
        if user and user.locked_until and user.locked_until > now:
            raise AccountLocked(user.locked_until)

        # Prevent timing attacks
        dummy_hash = "$2b$12$Dpy.PpyOQ.C.C.C.C.C.C.C.C.C.C.C.C.C.C.C.C.C.C.C.C." 
        is_valid = security.verify_password(login_in.password.get_secret_value(), user.hashed_password if user else dummy_hash)
        
        if not user or not is_valid:
            if user:
                user.failed_login_attempts += 1
                if user.failed_login_attempts >= settings.MAX_FAILED_ATTEMPTS:
                    user.locked_until = now + timedelta(minutes=settings.LOCKOUT_DURATION_MINUTES)
                await self.user_repo.update(user)

            # IP tracking
            if ip_address:
                if not ip_attempt:
                    ip_attempt = LoginAttempt(ip_address=ip_address, count=1)
                    self.user_repo.db.add(ip_attempt)
                else:
                    ip_attempt.count += 1
                    ip_attempt.last_attempt = now
                    if ip_attempt.count >= settings.IP_BLOCK_THRESHOLD:
                        ip_attempt.blocked_until = now + timedelta(minutes=settings.IP_BLOCK_MINUTES)
            
            await self.user_repo.db.commit()
            raise InvalidCredentials()

        if not user.is_verified:
            raise EmailNotVerified()
            
        # Reset failed attempts on success
        if user.failed_login_attempts > 0 or user.locked_until:
            user.failed_login_attempts = 0
            user.locked_until = None
            await self.user_repo.update(user)

        if ip_attempt:
            ip_attempt.count = 0
            ip_attempt.blocked_until = None

        await self.user_repo.db.commit()

        # Create JTI and UserSession
        jti = secrets.token_urlsafe(16)
        refresh_expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)
        
        user_session = UserSession(
            user_id=user.id,
            jti=jti,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=refresh_expires_at,
        )
        await self.session_repo.create(user_session)
        await self.session_repo.db.commit()

        # Create both tokens
        access_token = security.create_access_token(subject=user.id, jti=jti)
        refresh_token = security.create_refresh_token(subject=user.id, jti=jti)
        
        # Set HttpOnly cookies
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite="lax",
            max_age=settings.SESSION_TOKEN_TTL_MINUTES * 60,
        )
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite="lax",
            max_age=settings.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
        )
        
        return user

    async def login_social(self, user: User, response: Response, ip_address: str | None = None, user_agent: str | None = None) -> User:
        """
        Generic social login session management.
        """
        if not user.is_active:
             raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is inactive")
        
        jti = secrets.token_urlsafe(16)
        refresh_expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)
        
        user_session = UserSession(
            user_id=user.id,
            jti=jti,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=refresh_expires_at,
        )
        await self.session_repo.create(user_session)
        await self.session_repo.db.commit()

        access_token = security.create_access_token(subject=user.id, jti=jti)
        refresh_token = security.create_refresh_token(subject=user.id, jti=jti)
        
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite="lax",
            max_age=settings.SESSION_TOKEN_TTL_MINUTES * 60,
        )
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite="lax",
            max_age=settings.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
        )
        
        return user

    async def logout(self, response: Response, jti: str | None = None):
        if jti:
            session = await self.session_repo.get_by_jti(jti)
            if session:
                session.is_revoked = True
                await self.session_repo.db.commit()

        response.delete_cookie(
            key="access_token",
            httponly=True,
            samesite="lax",
            path="/",
        )
        response.delete_cookie(
            key="refresh_token",
            httponly=True,
            samesite="lax",
            path="/",
        )
        response.delete_cookie(
            key="csrf_token",
            httponly=False,
            samesite="lax",
            path="/",
        )

    async def verify_email(self, token: str) -> bool:
        verification_token = await self.verification_repo.get_by_token(token)
        if not verification_token:
            raise TokenInvalid()
        
        if verification_token.expires_at < datetime.now(timezone.utc):
            raise TokenExpired()

        user = await self.user_repo.get_by_id(verification_token.user_id)
        if not user:
            raise TokenInvalid()

        user.is_verified = True
        await self.user_repo.update(user)
        
        # Cleanup token
        await self.verification_repo.delete_by_user_id(user.id)
        
        # Atomically verify and cleanup
        await self.user_repo.db.commit()
        return True
    async def request_password_reset(self, email: str) -> None:
        user = await self.user_repo.get_by_email(email.lower())
        if not user:
            # Prevent email enumeration: return success even if user not found
            return

        # Create reset token
        token = secrets.token_urlsafe(32)
        verification_token = VerificationToken(
            user_id=user.id,
            token=token,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.PASSWORD_RESET_TTL_HOURS),
        )
        await self.verification_repo.create(verification_token)
        await self.verification_repo.db.commit()

        # Send email
        await self.email_service.send_reset_password_email(user.email, token)

    async def reset_password(self, reset_in: ResetPasswordRequest) -> bool:
        verification_token = await self.verification_repo.get_by_token(reset_in.token)
        if not verification_token:
            raise TokenInvalid()
        
        if verification_token.expires_at < datetime.now(timezone.utc):
            raise TokenExpired()

        user = await self.user_repo.get_by_id(verification_token.user_id)
        if not user:
            raise TokenInvalid()

        user.hashed_password = security.get_password_hash(reset_in.new_password.get_secret_value())
        await self.user_repo.update(user)
        
        # Cleanup token
        await self.verification_repo.delete_by_user_id(user.id)
        await self.user_repo.db.commit()
        
        return True

    async def update_password(self, user: User, update_in: UpdatePasswordRequest) -> None:
        if not security.verify_password(update_in.current_password.get_secret_value(), user.hashed_password):
            raise InvalidPassword()
        
        user.hashed_password = security.get_password_hash(update_in.new_password.get_secret_value())
        await self.user_repo.update(user)
        
        # Optionally revoke all other sessions on password change for extra security
        await self.session_repo.revoke_all_for_user(user.id)
        await self.user_repo.db.commit()

    async def refresh_session(self, refresh_token: str, response: Response) -> User:
        try:
            payload = security.decode_token(refresh_token, expected_type="refresh")
            jti = payload.get("jti")
            user_id = payload.get("sub")
            
            if not jti or not user_id:
                raise TokenInvalid()
                
            session = await self.session_repo.get_by_jti(jti)
            if not session or session.is_revoked or session.expires_at < datetime.now(timezone.utc):
                raise TokenInvalid()
                
            user = await self.user_repo.get_by_id(uuid.UUID(user_id))
            if not user or not user.is_active:
                raise TokenInvalid()
                
            # Issue new access token (keep same JTI/session)
            new_access_token = security.create_access_token(subject=user.id, jti=jti)
            
            response.set_cookie(
                key="access_token",
                value=new_access_token,
                httponly=True,
                secure=settings.COOKIE_SECURE,
                samesite="lax",
                max_age=settings.SESSION_TOKEN_TTL_MINUTES * 60,
            )
            
            # Update last active
            session.last_active = datetime.now(timezone.utc)
            await self.session_repo.db.commit()
            
            return user
        except Exception:
            raise TokenInvalid()

    async def get_active_sessions(self, user_id: Any) -> list[UserSession]:
        return await self.session_repo.get_active_by_user(user_id)

    async def revoke_session(self, session_id: Any, user_id: Any) -> bool:
        success = await self.session_repo.revoke_by_id(session_id, user_id)
        if success:
             await self.session_repo.db.commit()
        return success

    async def revoke_all_sessions(self, user_id: Any, except_jti: str | None = None) -> None:
        await self.session_repo.revoke_all_for_user(user_id, except_jti)
        await self.session_repo.db.commit()

    async def authenticate_google(self, id_token: str) -> User:
        """
        Verify Google ID token and return/create user.
        """
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}")
            if resp.status_code != 200:
                raise TokenInvalid("Invalid Google ID token")
            
            data = resp.json()
            if data["aud"] != settings.GOOGLE_CLIENT_ID:
                raise TokenInvalid("Invalid token audience")
            
            email = data["email"].lower()
            user = await self.user_repo.get_by_email(email)
            
            if not user:
                # Create user if not exists
                user = User(
                    email=email,
                    hashed_password=security.get_password_hash(secrets.token_urlsafe(32)),
                    full_name=data.get("name", "Google User"),
                    is_verified=data.get("email_verified", False),
                )
                user = await self.user_repo.create(user)
                await self.user_repo.db.commit()
                await self.user_repo.db.refresh(user)
            
            return user
