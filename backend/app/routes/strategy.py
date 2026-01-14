from fastapi import APIRouter
from app.ml.backtester import run_backtest
from app.ml.engine import generate_signal  # 👈 CONNECT ML BRAIN

router = APIRouter(
    prefix="/strategy",
    tags=["strategy"]
)


@router.get("/signal")
def get_strategy_signal():
    """
    Returns the current best trading signal (if any).
    """
    result = generate_signal()
    return result


@router.get("/backtest")
def backtest():
    return run_backtest()