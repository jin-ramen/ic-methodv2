from fastapi import APIRouter, HTTPException
from app.notion.client import notion, get_text
from app.core.config import settings
from app.core.cache import cached

router = APIRouter(prefix="/api", tags=["notion"])

@router.get("/people")
async def get_people():
    try:
        def fetch():
            db = notion.databases.retrieve(database_id=settings.people_db_id)
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

@router.get("/studio")
async def get_studio():
    try:
        def fetch():
            db = notion.databases.retrieve(database_id=settings.studio_db_id)
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