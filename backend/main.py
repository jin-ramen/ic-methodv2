from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from notion_client import Client
from dotenv import load_dotenv
import os
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

from pathlib import Path

DIST = Path(__file__).parent / "frontend" / "dist"

app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    return FileResponse(DIST / "index.html")

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
        db = notion.databases.retrieve(database_id=PEOPLE_DB_ID)
        data_source_id = db["data_sources"][0]["id"]
        response = notion.data_sources.query(data_source_id=data_source_id)

        people = []
        for page in response["results"]: 
            props = page["properties"]
            people.append({
                "name": get_text(props.get("Name")),
                "role": get_text(props.get("Role")),
                "img": get_text(props.get("Img")),
                "bio": get_text(props.get("Bio"))
            })
        return {"results": people}
    except Exception as e: 
        raise HTTPException(status_code=500, detail=str(e))
    
@api.get("/studio")
async def get_studio(): 
    try: 
        db = notion.databases.retrieve(database_id=STUDIO_DB_ID) # get database
        data_source_id = db["data_sources"][0]["id"] # get 
        response = notion.data_sources.query(data_source_id=data_source_id) # get data source

        studio_pics = []
        for page in response["results"]: 
            props = page["properties"]
            studio_pics.append({
                "title": get_text(props.get("Title")),
                "img": get_text(props.get("Img"))
            })
        return {"results": studio_pics}
    except Exception as e: 
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(api)
