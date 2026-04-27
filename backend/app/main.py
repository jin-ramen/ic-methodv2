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
from app.routes import notion_cms, methods, bookings, sessions, users, notifications
from app.services.reminder import process_due_reminders

_REMINDER_POLL_INTERVAL = 300  # 5 minutes


async def _reminder_loop() -> None:
    while True:
        await asyncio.sleep(_REMINDER_POLL_INTERVAL)
        try:
            async with AsyncSessionLocal() as db:
                await process_due_reminders(db)
        except Exception:
            pass


@asynccontextmanager
async def lifespan(_: FastAPI):
    task = asyncio.create_task(_reminder_loop())
    yield
    task.cancel()
    try:
        await task
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

DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if (DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")


@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    if DIST.exists():
        return FileResponse(DIST / "index.html")
    return {"message": "API is running"}
