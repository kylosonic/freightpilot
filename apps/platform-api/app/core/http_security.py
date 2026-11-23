"""Shared HTTP middleware for the local API and Cloudflare Worker runtime."""

from __future__ import annotations

import logging
import re
import time
from uuid import uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import StatementError
from starlette.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings
from app.core.observability import app_metrics

logger = logging.getLogger('app.http')

_REQUEST_ID_RE = re.compile(r'^[A-Za-z0-9._-]{1,64}$')


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        supplied_id = request.headers.get('x-request-id', '')
        request_id = supplied_id if _REQUEST_ID_RE.fullmatch(supplied_id) else str(uuid4())
        start = time.perf_counter()
        try:
            response: Response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            app_metrics.record_exception()
            logger.exception(
                'request_failed method=%s path=%s duration_ms=%.2f request_id=%s',
                request.method,
                request.url.path,
                duration_ms,
                request_id,
            )
            raise

        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers['X-Request-ID'] = request_id
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Content-Security-Policy'] = "default-src 'none'; base-uri 'none'; frame-ancestors 'none'"
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        if request.url.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store'

        app_metrics.record_http(response.status_code)
        logger.info(
            'request_completed method=%s path=%s status=%s duration_ms=%.2f request_id=%s',
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request_id,
        )
        return response


def add_http_security(app: FastAPI) -> None:
    @app.exception_handler(StatementError)
    async def invalid_identifier(_request: Request, exc: StatementError):
        orig = exc.orig
        message = str(orig or exc)
        if isinstance(orig, ValueError) or 'UUID' in message or 'uuid' in message:
            return JSONResponse(
                status_code=422,
                content={'detail': 'Invalid identifier'},
            )
        return JSONResponse(status_code=500, content={'detail': 'Database request failed'})

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.effective_cors_origins,
        allow_credentials='*' not in settings.effective_cors_origins,
        allow_methods=['*'],
        allow_headers=['*'],
    )
    if settings.effective_allowed_hosts:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=settings.effective_allowed_hosts,
        )
    app.add_middleware(RequestContextMiddleware)

