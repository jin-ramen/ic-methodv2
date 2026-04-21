from fastapi import APIRouter, HTTPException
from app.services.notion_cms import fetch_notion_data, get_text
from app.core.config import settings
from app.core.cache import cached

router = APIRouter(prefix='/api', tags=["notion_cms"])

@router.get("/people")
async def get_people():
    def mapper(props):
        return {
            "name": get_text(props.get("Name")),
            "role": get_text(props.get("Role")),
            "img": get_text(props.get("Img")),
            "bio": get_text(props.get("Bio")),
        }
    return {"results": cached("people", lambda: fetch_notion_data(settings.people_db_id, mapper))}

@router.get("/studio")
async def get_studio(): 
    def mapper(props):
        return {
            "title": get_text(props.get("Title")),
            "img": get_text(props.get("Img")),
        }
    return {"results": cached("studio", lambda: fetch_notion_data(settings.studio_db_id, mapper))}