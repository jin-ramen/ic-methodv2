from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.method import create_method, list_methods, update_method, delete_method
from app.schemas.method import MethodCreate, MethodUpdate, MethodResponse

router = APIRouter(prefix="/api", tags=["method"])


@router.post("/methods", response_model=MethodResponse, status_code=status.HTTP_201_CREATED)
async def post_method(data: MethodCreate, db: AsyncSession = Depends(get_db)):
    return await create_method(db, name=data.name, price=data.price, description=data.description)


@router.get("/methods", response_model=dict)
async def get_methods(db: AsyncSession = Depends(get_db)):
    methods = await list_methods(db)
    return {"results": [MethodResponse.model_validate(m).model_dump(mode="json") for m in methods]}


@router.patch("/methods/{id}", response_model=MethodResponse)
async def patch_method(id: UUID, data: MethodUpdate, db: AsyncSession = Depends(get_db)):
    method = await update_method(db, id, data.name, data.price, data.description)
    if not method:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Method not found")
    return method


@router.delete("/methods/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def del_method(id: UUID, db: AsyncSession = Depends(get_db)):
    if not await delete_method(db, id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Method not found")
