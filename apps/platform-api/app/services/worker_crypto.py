from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import time

from Crypto.Cipher import AES
from Crypto.Hash import SHA256
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Util.Padding import pad, unpad

_FERNET_VERSION = b'\x80'
_BLOCK_SIZE = AES.block_size
_TOKEN_OVERHEAD = 1 + 8 + _BLOCK_SIZE + _BLOCK_SIZE + 32


class WorkerFernetError(ValueError):
    """Raised when a token cannot be authenticated or decrypted."""


def pbkdf2_sha256(password: str, salt: str, iterations: int) -> bytes:
    """Match cryptography's PBKDF2-HMAC-SHA256 output on Pyodide."""
    return PBKDF2(
        password.encode('utf-8'),  # type: ignore[arg-type]  # PyCryptodome accepts bytes at runtime.
        salt.encode('utf-8'),
        dkLen=32,
        count=iterations,
        hmac_hash_module=SHA256,
    )


class WorkerFernet:
    """Small Fernet-compatible implementation backed by audited PyCryptodome primitives.

    Cryptography does not yet publish a patched WebAssembly wheel for the Worker
    runtime. This class preserves the Fernet wire format so existing provider
    keys keep working and tokens remain readable by the standard API.
    """

    def __init__(self, key: bytes):
        try:
            decoded = base64.urlsafe_b64decode(key)
        except Exception as exc:
            raise ValueError('Fernet key must be 32 url-safe base64-encoded bytes') from exc
        if len(decoded) != 32:
            raise ValueError('Fernet key must be 32 url-safe base64-encoded bytes')
        self._signing_key = decoded[:16]
        self._encryption_key = decoded[16:]

    def encrypt(self, data: bytes) -> bytes:
        iv = secrets.token_bytes(_BLOCK_SIZE)
        ciphertext = AES.new(self._encryption_key, AES.MODE_CBC, iv).encrypt(pad(data, _BLOCK_SIZE))
        signed = _FERNET_VERSION + int(time.time()).to_bytes(8, 'big') + iv + ciphertext
        signature = hmac.new(self._signing_key, signed, hashlib.sha256).digest()
        return base64.urlsafe_b64encode(signed + signature)

    def decrypt(self, token: bytes) -> bytes:
        try:
            raw = base64.urlsafe_b64decode(token)
        except Exception as exc:
            raise WorkerFernetError('Invalid Fernet token') from exc
        if len(raw) < _TOKEN_OVERHEAD or not raw.startswith(_FERNET_VERSION):
            raise WorkerFernetError('Invalid Fernet token')

        signed, signature = raw[:-32], raw[-32:]
        expected = hmac.new(self._signing_key, signed, hashlib.sha256).digest()
        if not hmac.compare_digest(signature, expected):
            raise WorkerFernetError('Invalid Fernet token')

        iv_start = 1 + 8
        iv_end = iv_start + _BLOCK_SIZE
        iv = signed[iv_start:iv_end]
        ciphertext = signed[iv_end:]
        if not ciphertext or len(ciphertext) % _BLOCK_SIZE:
            raise WorkerFernetError('Invalid Fernet token')
        try:
            return unpad(AES.new(self._encryption_key, AES.MODE_CBC, iv).decrypt(ciphertext), _BLOCK_SIZE)
        except ValueError as exc:
            raise WorkerFernetError('Invalid Fernet token') from exc


class WorkerMultiFernet:
    def __init__(self, keys: list[WorkerFernet]):
        if not keys:
            raise ValueError('At least one Fernet key is required')
        self._keys = keys

    def encrypt(self, data: bytes) -> bytes:
        return self._keys[0].encrypt(data)

    def decrypt(self, token: bytes) -> bytes:
        for key in self._keys:
            try:
                return key.decrypt(token)
            except WorkerFernetError:
                continue
        raise WorkerFernetError('Invalid Fernet token')
