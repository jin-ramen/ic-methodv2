import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limiter
from app.db.session import AsyncSessionLocal
from app.routes import notion_cms, methods, bookings, sessions, users, notifications, balances, payments
from app.services.reminder import process_due_reminders
from app.services.payment import release_stale_pending_payments
from app.services.booking import mark_completed_bookings

_REMINDER_POLL_INTERVAL = 300  # 5 minutes
_STALE_PAYMENT_POLL_INTERVAL = 120  # 2 minutes
_COMPLETION_POLL_INTERVAL = 60  # 1 minute


async def _reminder_loop() -> None:
    while True:
        await asyncio.sleep(_REMINDER_POLL_INTERVAL)
        try:
            async with AsyncSessionLocal() as db:
                await process_due_reminders(db)
        except Exception:
            pass


async def _stale_payment_loop() -> None:
    while True:
        await asyncio.sleep(_STALE_PAYMENT_POLL_INTERVAL)
        try:
            async with AsyncSessionLocal() as db:
                await release_stale_pending_payments(db)
        except Exception:
            pass


async def _completion_loop() -> None:
    while True:
        await asyncio.sleep(_COMPLETION_POLL_INTERVAL)
        try:
            async with AsyncSessionLocal() as db:
                await mark_completed_bookings(db)
        except Exception:
            pass


@asynccontextmanager
async def lifespan(_: FastAPI):
    tasks = [
        asyncio.create_task(_reminder_loop()),
        asyncio.create_task(_stale_payment_loop()),
        asyncio.create_task(_completion_loop()),
    ]
    yield
    for t in tasks:
        t.cancel()
    for t in tasks:
        try:
            await t
        except asyncio.CancelledError:
            pass


app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(notion_cms.router)
app.include_router(methods.router)
app.include_router(sessions.router)
app.include_router(bookings.router)
app.include_router(notifications.router)
app.include_router(balances.router)
app.include_router(payments.router)

DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if (DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")


from fastapi import HTTPException # Add this import at the top

@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    # CRITICAL: If the path starts with 'api', DO NOT return the HTML file.
    # This prevents the fallback from intercepting API calls and preflight OPTIONS checks.
    if full_path.startswith("api"):
        raise HTTPException(status_code=404)

    if DIST.exists():
        return FileResponse(DIST / "index.html")
    
    return {"message": "API is running"}
