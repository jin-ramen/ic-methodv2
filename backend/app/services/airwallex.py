import asyncio
import hashlib
import hmac
import http.client
import json
import time
from decimal import Decimal
from typing import Any

from app.core.config import settings


_TOKEN_CACHE: dict[str, Any] = {"token": None, "expires_at": 0.0}
_TOKEN_LOCK = asyncio.Lock()
_TOKEN_TTL_SECONDS = 25 * 60  # tokens last 30 minutes; refresh slightly earlier


def _request(method: str, path: str, headers: dict[str, str], body: bytes | None = None) -> tuple[int, bytes]:
    conn = http.client.HTTPSConnection(settings.base_url)
    try:
        conn.request(method, path, body, headers)
        res = conn.getresponse()
        return res.status, res.read()
    finally:
        conn.close()


async def _request_async(method: str, path: str, headers: dict[str, str], body: bytes | None = None) -> tuple[int, bytes]:
    return await asyncio.to_thread(_request, method, path, headers, body)


async def get_airwallex_token() -> str:
    now = time.time()
    if _TOKEN_CACHE["token"] and _TOKEN_CACHE["expires_at"] > now:
        return _TOKEN_CACHE["token"]

    async with _TOKEN_LOCK:
        now = time.time()
        if _TOKEN_CACHE["token"] and _TOKEN_CACHE["expires_at"] > now:
            return _TOKEN_CACHE["token"]

        headers = {
            "Content-Type": "application/json",
            "x-api-key": settings.airwallex_api_key,
            "x-client-id": settings.airwallex_client_id,
        }
        status_code, raw = await _request_async(
            "POST", "/api/v1/authentication/login", headers, json.dumps({}).encode("utf-8")
        )
        if status_code >= 400:
            raise RuntimeError(f"airwallex_auth_failed: {status_code} {raw.decode('utf-8', errors='replace')}")
        data = json.loads(raw.decode("utf-8"))
        _TOKEN_CACHE["token"] = data["token"]
        _TOKEN_CACHE["expires_at"] = now + _TOKEN_TTL_SECONDS
        return data["token"]


async def _authed_headers(extra: dict[str, str] | None = None) -> dict[str, str]:
    token = await get_airwallex_token()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }
    if extra:
        headers.update(extra)
    return headers


async def get_airwallex_balance() -> list[dict[str, Any]]:
    headers = await _authed_headers()
    status_code, raw = await _request_async("GET", "/api/v1/balances/current", headers)
    if status_code >= 400:
        raise RuntimeError(f"airwallex_balance_failed: {status_code} {raw.decode('utf-8', errors='replace')}")
    return json.loads(raw.decode("utf-8"))


async def create_payment_intent(
    *,
    request_id: str,
    merchant_order_id: str,
    amount: Decimal,
    currency: str,
    return_url: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "request_id": request_id,
        "merchant_order_id": merchant_order_id,
        "amount": float(amount),
        "currency": currency,
    }
    if return_url:
        payload["return_url"] = return_url
    if metadata:
        payload["metadata"] = metadata

    headers = await _authed_headers()
    status_code, raw = await _request_async(
        "POST",
        "/api/v1/pa/payment_intents/create",
        headers,
        json.dumps(payload).encode("utf-8"),
    )
    if status_code >= 400:
        raise RuntimeError(f"airwallex_intent_create_failed: {status_code} {raw.decode('utf-8', errors='replace')}")
    return json.loads(raw.decode("utf-8"))


async def retrieve_payment_intent(payment_intent_id: str) -> dict[str, Any]:
    headers = await _authed_headers()
    status_code, raw = await _request_async(
        "GET", f"/api/v1/pa/payment_intents/{payment_intent_id}", headers
    )
    if status_code >= 400:
        raise RuntimeError(f"airwallex_intent_retrieve_failed: {status_code} {raw.decode('utf-8', errors='replace')}")
    return json.loads(raw.decode("utf-8"))


async def cancel_payment_intent(payment_intent_id: str, request_id: str) -> dict[str, Any]:
    headers = await _authed_headers()
    body = json.dumps({"request_id": request_id}).encode("utf-8")
    status_code, raw = await _request_async(
        "POST",
        f"/api/v1/pa/payment_intents/{payment_intent_id}/cancel",
        headers,
        body,
    )
    if status_code >= 400:
        raise RuntimeError(f"airwallex_intent_cancel_failed: {status_code} {raw.decode('utf-8', errors='replace')}")
    return json.loads(raw.decode("utf-8"))


def verify_webhook_signature(timestamp: str, raw_body: bytes, signature: str) -> bool:
    secret = settings.airwallex_webhook_secret
    if not secret or not timestamp or not signature:
        return False
    payload = timestamp.encode("utf-8") + raw_body
    digest = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, signature)


def map_intent_status(airwallex_status: str) -> str:
    s = (airwallex_status or "").upper()
    if s in {"SUCCEEDED", "CAPTURE_REQUIRED"}:
        return "succeeded"
    if s == "CANCELLED":
        return "cancelled"
    if s in {"FAILED", "EXPIRED"}:
        return "failed"
    return "pending"
