from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from app.api.v1.endpoints import notion_cms


app = FastAPI()

app.include_router(notion_cms.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

DIST = Path(__file__).parent / "frontend" / "dist"
if (DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    if DIST.exists():
        return FileResponse(DIST / "index.html")
    return {"message": "API is running"}
