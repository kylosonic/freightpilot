from __future__ import annotations

import hashlib
import hmac
import secrets
from base64 import urlsafe_b64encode
from datetime import UTC, datetime, timedelta

import jwt
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.core.config import settings
from app.schemas.auth import UserRole

_PBKDF2_ITERATIONS = 600_000


def _pbkdf2_hash(password: str, salt: str, iterations: int = _PBKDF2_ITERATIONS) -> str:
    # Use cryptography's optimized PBKDF2 implementation. The Python Workers
    # runtime exposes hashlib.pbkdf2_hmac but currently produces unstable
    # authentication results in Pyodide.
    digest = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt.encode('utf-8'),
        iterations=iterations,
    ).derive(password.encode('utf-8'))
    return urlsafe_b64encode(digest).decode('utf-8')


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    return f'pbkdf2_sha256${salt}${_pbkdf2_hash(password, salt)}'


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        algorithm, salt, hashed = hashed_password.split('$', 2)
        if algorithm != 'pbkdf2_sha256':
            return False
        candidate = _pbkdf2_hash(password, salt)
        return hmac.compare_digest(candidate, hashed)
    except Exception:
        return False


_DUMMY_TIMING_HASH = hash_password('__dummy_timing_guard__')


def verify_dummy_password(password: str = '__dummy_timing_probe__') -> bool:
    """Run constant-cost PBKDF2 verification when an account lookup misses."""
    return verify_password(password, _DUMMY_TIMING_HASH)


def create_access_token(
    subject: str,
    role: UserRole,
    expires_delta: timedelta | None = None,
    token_version: int = 0,
) -> str:
    now = datetime.now(UTC)
    expire = now + (expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes))
    payload = {
        'sub': str(subject),
        'role': role,
        'typ': 'access',
        'ver': token_version,
        'iat': int(now.timestamp()),
        'exp': int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.effective_jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token_for_org(
    subject: str,
    role: UserRole,
    organization_id: str,
    expires_delta: timedelta | None = None,
    token_version: int = 0,
) -> str:
    now = datetime.now(UTC)
    expire = now + (expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes))
    payload = {
        'sub': str(subject),
        'role': role,
        'org_id': str(organization_id),
        'typ': 'access',
        'ver': token_version,
        'iat': int(now.timestamp()),
        'exp': int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.effective_jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_ws_token_for_org(
    subject: str,
    role: UserRole,
    organization_id: str,
    expires_delta: timedelta | None = None,
    token_version: int = 0,
) -> str:
    """Short-lived Live Updates credential with a WS-only token type."""
    now = datetime.now(UTC)
    expire = now + (expires_delta or timedelta(minutes=5))
    payload = {
        'sub': str(subject),
        'role': role,
        'org_id': str(organization_id),
        'typ': 'ws',
        'ver': token_version,
        'iat': int(now.timestamp()),
        'exp': int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.effective_jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.effective_jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise ValueError('Invalid or expired token') from exc


def _fernet_from_seed(seed: str) -> Fernet:
    digest = hashlib.sha256(seed.encode('utf-8')).digest()
    return Fernet(urlsafe_b64encode(digest))


def _provider_key_fernet():
    # seeded from the guarded effective secret; dev/test fallback
    # to the JWT secret is preserved when the raw value is empty.
    from cryptography.fernet import MultiFernet

    seed = settings.effective_provider_key_encryption_secret or settings.effective_jwt_secret_key
    primary = _fernet_from_seed(seed)
    prev = settings.provider_key_encryption_previous_secret
    if prev and prev != seed:
        return MultiFernet([primary, _fernet_from_seed(prev)])
    return primary


def encrypt_provider_key(raw_key: str) -> str:
    token = _provider_key_fernet().encrypt(raw_key.encode('utf-8'))
    return token.decode('utf-8')


def decrypt_provider_key(encrypted_key: str) -> str:
    raw = _provider_key_fernet().decrypt(encrypted_key.encode('utf-8'))
    return raw.decode('utf-8')


def mask_provider_key(raw_key: str) -> str:
    cleaned = raw_key.strip()
    if len(cleaned) <= 8:
        return '*' * len(cleaned)
    return f'{cleaned[:4]}***{cleaned[-4:]}'
