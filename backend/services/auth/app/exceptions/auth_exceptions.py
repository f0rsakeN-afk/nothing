from fastapi import HTTPException, status

class AuthException(HTTPException):
    def __init__(self, detail: str, status_code: int = status.HTTP_401_UNAUTHORIZED):
        super().__init__(status_code=status_code, detail=detail)

class UserAlreadyExists(AuthException):
    def __init__(self, email: str):
        super().__init__(
            detail=f"User with email {email} already exists",
            status_code=status.HTTP_400_BAD_REQUEST
        )

class InvalidCredentials(AuthException):
    def __init__(self):
        super().__init__(detail="Invalid email or password")

class EmailNotVerified(AuthException):
    def __init__(self):
        super().__init__(
            detail="Email not verified",
            status_code=status.HTTP_403_FORBIDDEN
        )

class TokenExpired(AuthException):
    def __init__(self):
        super().__init__(
            detail="Token has expired",
            status_code=status.HTTP_400_BAD_REQUEST
        )

class TokenInvalid(AuthException):
    def __init__(self):
        super().__init__(
            detail="Token is invalid",
            status_code=status.HTTP_400_BAD_REQUEST
        )

class AccountLocked(AuthException):
    def __init__(self, detail: str = "Account is temporarily locked due to too many failed attempts."):
        super().__init__(
            detail=detail,
            status_code=status.HTTP_403_FORBIDDEN
        )

class InvalidPassword(AuthException):
    def __init__(self, detail: str = "Password is insecure or has been compromised."):
        super().__init__(
            detail=detail,
            status_code=status.HTTP_400_BAD_REQUEST
        )

class IPBlocked(AuthException):
    def __init__(self, detail: str = "Your IP address is temporarily blocked due to multiple failed login attempts."):
        super().__init__(
            detail=detail,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS
        )
