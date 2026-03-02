from fastapi import APIRouter, Depends
from app.routes.auth import get_optional_user
from app.ml.paper_trader import get_portfolio

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

@router.get("/summary")
def summary(user: dict = Depends(get_optional_user)):
    p = get_portfolio(user["email"])
    return {
        "total_value": p["net_worth"],
        "daily_pnl": p["total_unrealised_pnl"] + p["total_realised_pnl"],
        "cash": p["balance"],
        "active_strategies": len(p["positions"]),
        "mode": "SIMULATED"
    }

@router.get("/performance")
def performance():
    return {
        "labels": ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        "equity": [92000,98000,96000,105000,112000,108000,120000,128000,125000,138000,150000,178000]
    }
