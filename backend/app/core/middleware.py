from __future__ import annotations
import time
import logging
from typing import Callable
from fastapi import Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import AuditLog, User
from app.utils.dependencies import get_current_user
from app.core.config import SECRET_KEY, ALGORITHM
from jose import JWTError, jwt

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds security headers to all HTTP responses.
    """
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs all incoming requests with timing and metadata.
    """
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Extract client IP
        client_ip = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        # Log request
        logger.info(
            f"Request: {request.method} {request.url.path} | "
            f"IP: {client_ip} | "
            f"User-Agent: {request.headers.get('user-agent', 'unknown')}"
        )
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        
        # Log response
        logger.info(
            f"Response: {request.method} {request.url.path} | "
            f"Status: {response.status_code} | "
            f"Duration: {process_time:.3f}s"
        )
        
        return response


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    """
    Automatically logs important actions to the audit log.
    Only logs write operations (POST, PUT, DELETE, PATCH).
    """
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip audit logging for GET, HEAD, OPTIONS requests
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return await call_next(request)
        
        # Skip audit logging for login endpoint (already logged separately)
        if "/login" in request.url.path:
            return await call_next(request)
        
        # Get user ID from token if available
        user_id = None
        token = request.headers.get("authorization", "").replace("Bearer ", "")
        if token:
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                user_id = int(payload.get("sub"))
            except (JWTError, KeyError, ValueError):
                pass
        
        # Process request
        response = await call_next(request)
        
        # Only log successful write operations
        if response.status_code < 400:
            try:
                db: Session = next(get_db())
                
                # Extract client IP
                client_ip = request.client.host if request.client else "unknown"
                forwarded_for = request.headers.get("X-Forwarded-For")
                if forwarded_for:
                    client_ip = forwarded_for.split(",")[0].strip()
                
                # Determine action type
                action = f"{request.method} {request.url.path}"
                
                # Create audit log entry
                audit_log = AuditLog(
                    action=action,
                    user_id=user_id,
                    details=f"{request.method} request to {request.url.path}",
                    ip_address=client_ip
                )
                
                db.add(audit_log)
                db.commit()
                
                logger.info(f"Audit log created: {action} by user {user_id}")
                
            except Exception as e:
                logger.error(f"Failed to create audit log: {e}")
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Basic rate limiting middleware to prevent abuse.
    Uses in-memory storage (consider Redis for production).
    """
    def __init__(self, app: ASGIApp, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.request_counts = {}
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        current_time = time.time()
        
        # Clean old entries
        self.request_counts = {
            ip: (count, timestamp)
            for ip, (count, timestamp) in self.request_counts.items()
            if current_time - timestamp < self.window_seconds
        }
        
        # Check rate limit
        if client_ip in self.request_counts:
            count, timestamp = self.request_counts[client_ip]
            if current_time - timestamp < self.window_seconds:
                if count >= self.max_requests:
                    logger.warning(f"Rate limit exceeded for IP: {client_ip}")
                    return Response(
                        content={"detail": "Rate limit exceeded. Please try again later."},
                        status_code=429,
                        media_type="application/json"
                    )
                self.request_counts[client_ip] = (count + 1, timestamp)
            else:
                self.request_counts[client_ip] = (1, current_time)
        else:
            self.request_counts[client_ip] = (1, current_time)
        
        return await call_next(request)
