"""Tests for app.core.security — pure unit tests, no DB required."""
import os
os.environ.setdefault("JWT_SECRET", "test-secret-key")
os.environ.setdefault("MAIL_USERNAME", "test@example.com")
os.environ.setdefault("MAIL_PASSWORD", "testpassword")
os.environ.setdefault("MAIL_FROM", "test@example.com")
os.environ.setdefault("MAIL_SERVER", "smtp.example.com")

import pytest
import jwt
from app.core.security import hash_password, verify_password, create_access_token, verify_access_token


def test_hash_password_returns_string():
    h = hash_password("mysecret")
    assert isinstance(h, str)
    assert h != "mysecret"


def test_verify_password_correct():
    h = hash_password("mysecret")
    assert verify_password("mysecret", h) is True


def test_verify_password_wrong():
    h = hash_password("mysecret")
    assert verify_password("wrongpassword", h) is False


def test_hash_is_not_deterministic():
    """Same plaintext should produce different hashes (salted)."""
    h1 = hash_password("same")
    h2 = hash_password("same")
    assert h1 != h2


def test_create_access_token_returns_string():
    token = create_access_token({"sub": "user-123"})
    assert isinstance(token, str)


def test_verify_access_token_round_trip():
    payload = {"sub": "user-abc"}
    token = create_access_token(payload)
    decoded = verify_access_token(token)
    assert decoded["sub"] == "user-abc"


def test_verify_access_token_invalid_raises():
    with pytest.raises(Exception):
        verify_access_token("not.a.valid.token")


def test_verify_access_token_tampered_raises():
    token = create_access_token({"sub": "user-xyz"})
    tampered = token[:-3] + "abc"
    with pytest.raises(Exception):
        verify_access_token(tampered)
