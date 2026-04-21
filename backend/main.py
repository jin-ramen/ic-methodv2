from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from notion_client import Client
from dotenv import load_dotenv
import os
import time
from pathlib import Path

load_dotenv()

notion = Client(auth=os.getenv("NOTION_TOKEN"))
PEOPLE_DB_ID = os.getenv("PEOPLE_DB_ID")
STUDIO_DB_ID = os.getenv("STUDIO_DB_ID")

app = FastAPI()
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

DIST = Path(__file__).parent / "frontend" / "dist"

_cache: dict = {}
CACHE_TTL = 300  # 5 minutes

def cached(key: str, fetch):
    entry = _cache.get(key)
    if entry and time.time() - entry["ts"] < CACHE_TTL:
        return entry["data"]
    data = fetch()
    _cache[key] = {"data": data, "ts": time.time()}
    return data

def get_text(prop):
    if not prop:
        return ""
    if prop["type"] == "title":
        return "".join([t["plain_text"] for t in prop["title"]])
    if prop["type"] == "rich_text":
        return "".join([t["plain_text"] for t in prop["rich_text"]])
    return ""

@api.get("/people")
async def get_people():
    try:
        def fetch():
            db = notion.databases.retrieve(database_id=PEOPLE_DB_ID)
            data_source_id = db["data_sources"][0]["id"]
            response = notion.data_sources.query(data_source_id=data_source_id)
            return [
                {
                    "name": get_text(props.get("Name")),
                    "role": get_text(props.get("Role")),
                    "img": get_text(props.get("Img")),
                    "bio": get_text(props.get("Bio")),
                }
                for page in response["results"]
                for props in [page["properties"]]
            ]
        return {"results": cached("people", fetch)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api.get("/studio")
async def get_studio():
    try:
        def fetch():
            db = notion.databases.retrieve(database_id=STUDIO_DB_ID)
            data_source_id = db["data_sources"][0]["id"]
            response = notion.data_sources.query(data_source_id=data_source_id)
            return [
                {
                    "title": get_text(props.get("Title")),
                    "img": get_text(props.get("Img")),
                }
                for page in response["results"]
                for props in [page["properties"]]
            ]
        return {"results": cached("studio", fetch)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(api)

DIST = Path(__file__).parent / "frontend" / "dist"
if (DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    if DIST.exists():
        return FileResponse(DIST / "index.html")
    return {"message": "API is running"}
