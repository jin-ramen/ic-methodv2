import time
from typing import Callable, Any
from app.core.config import settings

_cache: dict[str, dict[str, Any]] = {}

def cached(key: str, fetch: Callable[[], Any]) -> Any:
    entry = _cache.get(key)
    if entry and time.time() - entry["ts"] < settings.cache_ttl_seconds:
        return entry["data"]
    data = fetch()
    _cache[key] = {"data": data, "ts": time.time()}
    return data