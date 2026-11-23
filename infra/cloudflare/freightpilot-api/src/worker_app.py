from __future__ import annotations

from typing import Any

ENDPOINT_GROUPS: dict[str, tuple[tuple[str, str], ...]] = {
    'core': (
        ('auth', '/auth'),
        ('health', '/health'),
        ('providers', '/providers'),
    ),
    'data': (
        ('warehouses', '/warehouses'),
        ('items', '/items'),
        ('inventory', '/inventory'),
        ('orders', '/orders'),
        ('notifications', '/notifications'),
        ('feedback', '/feedback'),
    ),
    'account': (
        ('activation', '/activation'),
        ('subscriptions', '/subscriptions'),
        ('team', '/team'),
        ('billing', '/billing'),
    ),
    'logistics': (
        ('shipments', '/shipments'),
        ('alerts', '/alerts'),
        ('ops', '/ops'),
        ('insights', '/ops'),
        ('weather', '/weather'),
    ),
    'operations': (
        ('drivers', '/drivers'),
        ('cash_collections', '/cash-collections'),
        ('planning', '/planning'),
    ),
    'dispatch': (
        ('dispatch', '/dispatch'),
    ),
    'finance': (
        ('receipts', '/receipts'),
        ('receipt_reversals', '/receipts'),
        ('invoices', '/invoices'),
    ),
    'routing': (
        ('ingestion', '/ingestion'),
        ('routes', '/routes'),
    ),
    'analytics': (
        ('forecast', '/forecast'),
        ('live', '/live'),
    ),
}


def build_app(group: str) -> Any:
    """Build only the endpoint subset owned by one Durable Object class."""
    if group not in ENDPOINT_GROUPS:
        raise ValueError(f'Unknown API group: {group}')

    # The Cloudflare Python runtime cannot start worker threads. FastAPI uses
    # Starlette's thread-pool helpers even for ordinary synchronous routes, so
    # execute those callbacks inline inside the Durable Object.
    import anyio.to_thread
    import starlette.concurrency

    async def run_inline(function: Any, *args: Any, **kwargs: Any) -> Any:
        return function(*args, **kwargs)

    async def run_sync_inline(function: Any, *args: Any, **kwargs: Any) -> Any:
        kwargs.pop('abandon_on_cancel', None)
        kwargs.pop('limiter', None)
        return function(*args, **kwargs)

    async def iterate_inline(iterator: Any):
        for item in iterator:
            yield item

    starlette.concurrency.run_in_threadpool = run_inline
    starlette.concurrency.iterate_in_threadpool = iterate_inline
    anyio.to_thread.run_sync = run_sync_inline

    from app.core.config import settings
    from app.core.http_security import add_http_security
    from app.db.migration_status import migration_readiness
    from app.db.session import get_engine
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    from sqlalchemy import text

    _ = (
        settings.effective_database_url,
        settings.effective_jwt_secret_key,
        settings.effective_provider_key_encryption_secret,
        settings.effective_receipt_extraction_mode,
        settings.effective_cbe_account_holder,
        settings.effective_cbe_account_number,
        settings.effective_dashen_account_holder,
        settings.effective_dashen_account_number,
    )

    app = FastAPI(title='Supply Chain Logistics API', version='1.0.0')
    add_http_security(app)

    for module_name, prefix in ENDPOINT_GROUPS[group]:
        module = __import__(
            f'app.api.endpoints.{module_name}',
            fromlist=['router'],
        )
        app.include_router(module.router, prefix=f'/api/v1{prefix}')

    @app.get('/health')
    def health():
        schema = {'status': 'unavailable', 'current': None, 'expected': None}
        try:
            with get_engine().connect() as connection:
                connection.execute(text('SELECT 1'))
                schema = migration_readiness(connection)
            db_status = 'ok'
        except Exception:  # noqa: BLE001 - readiness must report degraded instead of crashing
            db_status = 'unavailable'
        payload = {
            'status': 'ok' if db_status == 'ok' and schema['status'] == 'current' else 'degraded',
            'db': db_status,
            'schema': schema['status'],
            'revision': schema['current'],
            'expected_revision': schema['expected'],
        }
        return JSONResponse(
            payload,
            status_code=200 if payload['status'] == 'ok' else 503,
        )

    return app
