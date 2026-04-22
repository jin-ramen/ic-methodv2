from notion_client import Client
from app.core.config import settings

notion = Client(auth=settings.notion_token)

def get_text(prop):
    if not prop: return ""
    if prop["type"] == "title":
        return "".join([t["plain_text"] for t in prop["title"]])
    if prop["type"] == "rich_text":
        return "".join([t["plain_text"] for t in prop["rich_text"]])
    return ""

def fetch_notion_data(database_id, mapping_func):
    db = notion.databases.retrieve(database_id=database_id)
    data_source_id = db["data_sources"][0]["id"]
    response = notion.data_sources.query(data_source_id=data_source_id)
    return [mapping_func(page["properties"]) for page in response["results"]]
