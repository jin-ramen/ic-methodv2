from notion_client import Client
from app.core.config import settings

notion = Client(auth=settings.notion_token)

def get_text(prop) -> str:
    if not prop:
        return ""
    if prop["type"] == "title":
        return "".join(t["plain_text"] for t in prop["title"])
    if prop["type"] == "rich_text":
        return "".join(t["plain_text"] for t in prop["rich_text"])
    return ""