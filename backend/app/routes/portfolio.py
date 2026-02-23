from fastapi import APIRouter

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

@router.get("/summary")
def summary():
    return {
        "total_value": 178542,
        "daily_pnl": 1240,
        "cash": 32140,
        "active_strategies": 4,
        "mode": "SIMULATED"
    }

@router.get("/performance")
def performance():
    return {
        "labels": ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        "equity": [92000,98000,96000,105000,112000,108000,120000,128000,125000,138000,150000,178000]
    }
