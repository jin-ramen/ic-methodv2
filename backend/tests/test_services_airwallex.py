"""Tests for app.services.airwallex (no real network calls)."""
import os
os.environ.setdefault("JWT_SECRET", "test-secret-key")
os.environ.setdefault("MAIL_USERNAME", "test@example.com")
os.environ.setdefault("MAIL_PASSWORD", "testpassword")
os.environ.setdefault("MAIL_FROM", "test@example.com")
os.environ.setdefault("MAIL_SERVER", "smtp.example.com")

import hashlib
import hmac
import json
import time
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest

from app.services import airwallex


@pytest.fixture(autouse=True)
def _reset_token_cache():
    airwallex._TOKEN_CACHE["token"] = None
    airwallex._TOKEN_CACHE["expires_at"] = 0.0
    yield
    airwallex._TOKEN_CACHE["token"] = None
    airwallex._TOKEN_CACHE["expires_at"] = 0.0


def _ok(body: dict | list, code: int = 200):
    return code, json.dumps(body).encode("utf-8")


@pytest.mark.asyncio
async def test_get_airwallex_token_returns_token_and_caches():
    mock_resp = AsyncMock(return_value=_ok({"token": "tok_abc", "expires_at": "2030"}))
    with patch.object(airwallex, "_request_async", mock_resp):
        first = await airwallex.get_airwallex_token()
        second = await airwallex.get_airwallex_token()
    assert first == "tok_abc"
    assert second == "tok_abc"
    # Cached: second call shouldn't hit the network
    assert mock_resp.call_count == 1


@pytest.mark.asyncio
async def test_get_airwallex_token_refreshes_after_expiry():
    responses = [
        _ok({"token": "tok_first"}),
        _ok({"token": "tok_second"}),
    ]
    mock_resp = AsyncMock(side_effect=responses)
    with patch.object(airwallex, "_request_async", mock_resp):
        first = await airwallex.get_airwallex_token()
        # Force expiry
        airwallex._TOKEN_CACHE["expires_at"] = time.time() - 1
        second = await airwallex.get_airwallex_token()
    assert first == "tok_first"
    assert second == "tok_second"
    assert mock_resp.call_count == 2


@pytest.mark.asyncio
async def test_get_airwallex_token_raises_on_error():
    mock_resp = AsyncMock(return_value=(401, b'{"message":"unauthorized"}'))
    with patch.object(airwallex, "_request_async", mock_resp):
        with pytest.raises(RuntimeError, match="airwallex_auth_failed"):
            await airwallex.get_airwallex_token()


@pytest.mark.asyncio
async def test_get_airwallex_balance_returns_parsed_list():
    auth = _ok({"token": "tok"})
    balance_body = _ok([{"currency": "AUD", "available_amount": 100}])
    mock_resp = AsyncMock(side_effect=[auth, balance_body])
    with patch.object(airwallex, "_request_async", mock_resp):
        result = await airwallex.get_airwallex_balance()
    assert isinstance(result, list)
    assert result[0]["currency"] == "AUD"


@pytest.mark.asyncio
async def test_get_airwallex_balance_propagates_error():
    auth = _ok({"token": "tok"})
    fail = (500, b"server error")
    mock_resp = AsyncMock(side_effect=[auth, fail])
    with patch.object(airwallex, "_request_async", mock_resp):
        with pytest.raises(RuntimeError, match="airwallex_balance_failed"):
            await airwallex.get_airwallex_balance()


@pytest.mark.asyncio
async def test_create_payment_intent_sends_required_fields():
    auth = _ok({"token": "tok"})
    intent = _ok({
        "id": "int_123",
        "client_secret": "cs_xyz",
        "status": "REQUIRES_PAYMENT_METHOD",
    })
    mock_resp = AsyncMock(side_effect=[auth, intent])
    with patch.object(airwallex, "_request_async", mock_resp):
        result = await airwallex.create_payment_intent(
            request_id="req_1",
            merchant_order_id="ord_1",
            amount=Decimal("100.00"),
            currency="AUD",
            return_url="https://example.com/return",
            metadata={"booking_id": "b1"},
        )
    assert result["id"] == "int_123"
    # Inspect outgoing payload of the second call (intent create)
    intent_call = mock_resp.call_args_list[1]
    method, path, headers, body = intent_call.args
    assert method == "POST"
    assert path == "/api/v1/pa/payment_intents/create"
    assert headers["Authorization"] == "Bearer tok"
    payload = json.loads(body)
    assert payload["request_id"] == "req_1"
    assert payload["merchant_order_id"] == "ord_1"
    assert payload["amount"] == 100.0
    assert payload["currency"] == "AUD"
    assert payload["return_url"] == "https://example.com/return"
    assert payload["metadata"] == {"booking_id": "b1"}


@pytest.mark.asyncio
async def test_create_payment_intent_omits_optional_fields():
    auth = _ok({"token": "tok"})
    intent = _ok({"id": "int_1", "client_secret": "cs", "status": "REQUIRES_PAYMENT_METHOD"})
    mock_resp = AsyncMock(side_effect=[auth, intent])
    with patch.object(airwallex, "_request_async", mock_resp):
        await airwallex.create_payment_intent(
            request_id="r",
            merchant_order_id="o",
            amount=Decimal("9.99"),
            currency="USD",
        )
    payload = json.loads(mock_resp.call_args_list[1].args[3])
    assert "return_url" not in payload
    assert "metadata" not in payload


@pytest.mark.asyncio
async def test_create_payment_intent_raises_on_error():
    auth = _ok({"token": "tok"})
    fail = (400, b'{"message":"bad request"}')
    mock_resp = AsyncMock(side_effect=[auth, fail])
    with patch.object(airwallex, "_request_async", mock_resp):
        with pytest.raises(RuntimeError, match="airwallex_intent_create_failed"):
            await airwallex.create_payment_intent(
                request_id="r",
                merchant_order_id="o",
                amount=Decimal("1.00"),
                currency="AUD",
            )


@pytest.mark.asyncio
async def test_retrieve_payment_intent():
    auth = _ok({"token": "tok"})
    intent = _ok({"id": "int_xyz", "status": "SUCCEEDED"})
    mock_resp = AsyncMock(side_effect=[auth, intent])
    with patch.object(airwallex, "_request_async", mock_resp):
        result = await airwallex.retrieve_payment_intent("int_xyz")
    assert result["status"] == "SUCCEEDED"
    method, path, *_ = mock_resp.call_args_list[1].args
    assert method == "GET"
    assert path == "/api/v1/pa/payment_intents/int_xyz"


@pytest.mark.asyncio
async def test_cancel_payment_intent_sends_request_id():
    auth = _ok({"token": "tok"})
    intent = _ok({"id": "int_xyz", "status": "CANCELLED"})
    mock_resp = AsyncMock(side_effect=[auth, intent])
    with patch.object(airwallex, "_request_async", mock_resp):
        result = await airwallex.cancel_payment_intent("int_xyz", "req_cancel")
    assert result["status"] == "CANCELLED"
    method, path, headers, body = mock_resp.call_args_list[1].args
    assert method == "POST"
    assert path == "/api/v1/pa/payment_intents/int_xyz/cancel"
    assert json.loads(body) == {"request_id": "req_cancel"}


def test_verify_webhook_signature_valid():
    secret = "whsec_test"
    timestamp = "1700000000"
    body = b'{"name":"payment_intent.succeeded"}'
    expected = hmac.new(secret.encode(), timestamp.encode() + body, hashlib.sha256).hexdigest()

    with patch.object(airwallex.settings, "airwallex_webhook_secret", secret):
        assert airwallex.verify_webhook_signature(timestamp, body, expected) is True


def test_verify_webhook_signature_invalid():
    with patch.object(airwallex.settings, "airwallex_webhook_secret", "whsec_test"):
        assert airwallex.verify_webhook_signature("1700000000", b"{}", "deadbeef") is False


def test_verify_webhook_signature_missing_secret():
    with patch.object(airwallex.settings, "airwallex_webhook_secret", None):
        assert airwallex.verify_webhook_signature("1", b"{}", "x") is False


def test_verify_webhook_signature_missing_inputs():
    with patch.object(airwallex.settings, "airwallex_webhook_secret", "whsec_test"):
        assert airwallex.verify_webhook_signature("", b"{}", "x") is False
        assert airwallex.verify_webhook_signature("1", b"{}", "") is False


@pytest.mark.parametrize("airwallex_status,expected", [
    ("SUCCEEDED", "succeeded"),
    ("CAPTURE_REQUIRED", "succeeded"),
    ("CANCELLED", "cancelled"),
    ("FAILED", "failed"),
    ("EXPIRED", "failed"),
    ("REQUIRES_PAYMENT_METHOD", "pending"),
    ("REQUIRES_CUSTOMER_ACTION", "pending"),
    ("", "pending"),
    ("succeeded", "succeeded"),  # case-insensitive
])
def test_map_intent_status(airwallex_status, expected):
    assert airwallex.map_intent_status(airwallex_status) == expected
