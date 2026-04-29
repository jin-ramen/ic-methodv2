from fastapi import APIRouter, HTTPException, status

from app.services.airwallex import get_airwallex_balance


router = APIRouter(prefix="/api", tags=["balance"])


@router.get("/balances")
async def get_balance():
    try:
        return await get_airwallex_balance()
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))


@router.get("/balances/{currency_code}")
async def get_specific_balance(currency_code: str):
    try:
        all_balances = await get_airwallex_balance()
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    target_balance = next(
        (b for b in all_balances if b.get("currency", "").upper() == currency_code.upper()),
        None,
    )
    if not target_balance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Balance for currency '{currency_code}' not found",
        )
    return target_balance