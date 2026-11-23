import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any
from uuid import UUID

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings

sqlite3.register_adapter(UUID, lambda u: str(u))

_hyperdrive_binding: ContextVar[Any | None] = ContextVar(
    'hyperdrive_binding',
    default=None,
)
_hyperdrive_engine: ContextVar[Engine | None] = ContextVar(
    'hyperdrive_engine',
    default=None,
)
_local_engine: Engine | None = None


def _binding_value(binding: Any, name: str, default: Any = None) -> Any:
    value = getattr(binding, name, None)
    if value is None:
        try:
            value = binding[name]
        except (TypeError, KeyError, IndexError):
            value = None
    return default if value is None else value


def _sqlite_foreign_keys(dbapi_connection: Any, _connection_record: Any) -> None:
    if isinstance(dbapi_connection, sqlite3.Connection):
        dbapi_connection.execute('PRAGMA foreign_keys=ON')


def _create_local_engine() -> Engine:
    engine_kwargs: dict[str, Any] = {
        'pool_pre_ping': True,
        'echo': settings.app_env == 'development',
    }
    if settings.effective_database_url.startswith('postgresql'):
        engine_kwargs.update(
            {
                'pool_size': 10,
                'max_overflow': 20,
                'pool_recycle': 3600,
                # Bound failed database probes so /health fails fast.
                'connect_args': {'connect_timeout': 5},
            }
        )
    engine = create_engine(settings.effective_database_url, **engine_kwargs)
    event.listen(engine, 'connect', _sqlite_foreign_keys)
    return engine


def _create_hyperdrive_engine(binding: Any) -> Engine:
    """Build a request-scoped engine for Cloudflare's Hyperdrive socket shim."""
    url = URL.create(
        drivername='postgresql+pg8000',
        username=str(_binding_value(binding, 'user', '')),
        password=str(_binding_value(binding, 'password', '')),
        host=str(_binding_value(binding, 'host', '')),
        port=int(_binding_value(binding, 'port', 5432)),
        database=str(_binding_value(binding, 'database', '')),
    )
    return create_engine(
        url,
        poolclass=NullPool,
        pool_pre_ping=False,
        # Hyperdrive terminates origin TLS; the Workers socket shim cannot
        # negotiate TLS itself.
        connect_args={'ssl_context': False},
    )


def get_engine() -> Engine:
    binding = _hyperdrive_binding.get()
    if binding is not None:
        engine = _hyperdrive_engine.get()
        if engine is None:
            engine = _create_hyperdrive_engine(binding)
            _hyperdrive_engine.set(engine)
        return engine

    global _local_engine
    if _local_engine is None:
        _local_engine = _create_local_engine()
    return _local_engine


def get_session() -> Session:
    return sessionmaker(bind=get_engine(), autoflush=False, autocommit=False)()


def get_db() -> Iterator[Session]:
    db = get_session()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def use_hyperdrive(binding: Any) -> Iterator[None]:
    """Make the current Worker request use its Cloudflare Hyperdrive binding."""
    token = _hyperdrive_binding.set(binding)
    engine_token = _hyperdrive_engine.set(None)
    try:
        yield
    finally:
        engine = _hyperdrive_engine.get()
        if engine is not None:
            engine.dispose()
        _hyperdrive_engine.reset(engine_token)
        _hyperdrive_binding.reset(token)
