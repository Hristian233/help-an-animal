"""
Path-based rate limiting middleware using the limits library.
Applies different limits per endpoint without modifying route signatures.
"""

import os
import re

from limits import parse
from limits.storage import storage_from_string
from limits.strategies import STRATEGIES
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

# (method, path_pattern) -> limit string. Path can be exact or regex.
# First match wins. Use prefix match for dynamic paths like /markers/123.
RATE_LIMITS: list[tuple[str, str, str]] = [
    # (method, path_pattern, limit)
    ("POST", r"^/files/upload-url$", "5/minute"),
    ("POST", r"^/markers$", "10/minute"),
    ("PATCH", r"^/markers/", "20/minute"),
    ("GET", r"^/markers/all$", "60/minute"),
    ("GET", r"^/health$", "60/minute"),
    ("GET", r"^/$", "60/minute"),
    # Catch-all for any other path
    ("*", r".*", "60/minute"),
]

_ENABLED = os.getenv("TESTING", "").lower() not in ("1", "true", "yes")
_STORAGE = storage_from_string("memory://")
_LIMITER = STRATEGIES["fixed-window"](_STORAGE)


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host or "127.0.0.1"
    return "127.0.0.1"


def _get_limit_for_request(method: str, path: str) -> str | None:
    for limit_method, path_pattern, limit in RATE_LIMITS:
        if limit_method != "*" and limit_method != method:
            continue
        if re.match(path_pattern, path):
            return limit
    return None


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if not _ENABLED:
            return await call_next(request)

        method = request.method
        path = request.scope.get("path", "")
        limit_str = _get_limit_for_request(method, path)

        if not limit_str:
            return await call_next(request)

        item = parse(limit_str)
        client_ip = _get_client_ip(request)
        key = f"{client_ip}:{method}:{path}"

        if not _LIMITER.hit(item, key):
            return JSONResponse(
                {"error": f"Rate limit exceeded: {limit_str}"},
                status_code=429,
            )

        return await call_next(request)
