from __future__ import annotations

from base64 import urlsafe_b64encode
from hashlib import sha256

import pytest
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.services import security
from app.services.worker_crypto import WorkerFernet, WorkerFernetError, WorkerMultiFernet, pbkdf2_sha256


def _key(seed: bytes) -> bytes:
    return urlsafe_b64encode(sha256(seed).digest())


def test_worker_pbkdf2_matches_cryptography():
    expected = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'fixed-test-salt',
        iterations=1_000,
    ).derive(b'correct horse battery staple')

    assert pbkdf2_sha256('correct horse battery staple', 'fixed-test-salt', 1_000) == expected


def test_worker_fernet_tokens_are_cross_compatible():
    key = _key(b'worker-fernet-compatibility')
    standard = Fernet(key)
    worker = WorkerFernet(key)

    assert standard.decrypt(worker.encrypt(b'worker-to-api')) == b'worker-to-api'
    assert worker.decrypt(standard.encrypt(b'api-to-worker')) == b'api-to-worker'


def test_worker_multifernet_rotates_secrets_and_rejects_unknown_keys():
    primary = WorkerFernet(_key(b'primary'))
    previous = WorkerFernet(_key(b'previous'))
    unknown = WorkerFernet(_key(b'unknown'))
    multi = WorkerMultiFernet([primary, previous])

    assert multi.decrypt(previous.encrypt(b'rotated')) == b'rotated'
    with pytest.raises(WorkerFernetError):
        multi.decrypt(unknown.encrypt(b'foreign'))


def test_provider_keys_remain_readable_across_host_and_worker(monkeypatch):
    prod_settings = security.settings.model_copy(
        update={
            'provider_key_encryption_secret': 'worker-provider-key-secret-minimum-32-characters',
            'provider_key_encryption_previous_secret': '',
        }
    )
    monkeypatch.setattr(security, 'settings', prod_settings)

    monkeypatch.setenv('CLOUDFLARE_WORKER', '1')
    worker_token = security.encrypt_provider_key('sk-worker-123456')

    monkeypatch.delenv('CLOUDFLARE_WORKER')
    assert security.decrypt_provider_key(worker_token) == 'sk-worker-123456'

    host_token = security.encrypt_provider_key('sk-host-123456')
    monkeypatch.setenv('CLOUDFLARE_WORKER', '1')
    assert security.decrypt_provider_key(host_token) == 'sk-host-123456'


def test_worker_crypto_rejects_tampered_tokens(monkeypatch):
    monkeypatch.setenv('CLOUDFLARE_WORKER', '1')
    token = security.encrypt_provider_key('sk-tamper-test')
    tampered = token[:-2] + ('AA' if token[-2:] != 'AA' else 'BB')

    with pytest.raises(security.ProviderKeyDecryptError):
        security.decrypt_provider_key(tampered)


def test_worker_crypto_rejects_wrong_key(monkeypatch):
    monkeypatch.setenv('CLOUDFLARE_WORKER', '1')
    token = security.encrypt_provider_key('sk-wrong-key-test')
    monkeypatch.setattr(
        security,
        'settings',
        security.settings.model_copy(update={'provider_key_encryption_secret': 'x' * 40}),
    )

    with pytest.raises(security.ProviderKeyDecryptError):
        security.decrypt_provider_key(token)

    with pytest.raises(InvalidToken):
        Fernet(_key(b'unrelated')).decrypt(token.encode())
