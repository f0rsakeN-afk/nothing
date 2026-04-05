import secrets
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from fastapi import Request, HTTPException

class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Only check state-changing methods
        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            # Skip CSRF check for registration and login (they set the token)
            if request.url.path not in ["/auth/login", "/auth/register"]:
                csrf_token_cookie = request.cookies.get("csrf_token")
                csrf_token_header = request.headers.get("X-CSRF-Token")
                
                if not csrf_token_cookie or not csrf_token_header or csrf_token_cookie != csrf_token_header:
                    return Response(content="CSRF token validation failed", status_code=403)

        response: Response = await call_next(request)
        
        # Ensure a CSRF token exists for subsequent requests
        if not request.cookies.get("csrf_token"):
            token = secrets.token_urlsafe(32)
            response.set_cookie(
                key="csrf_token",
                value=token,
                httponly=False,  # Must be readable by JS to send back as header
                secure=request.url.scheme == "https",
                samesite="lax",
                path="/",
            )
        
        return response
