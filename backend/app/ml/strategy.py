from fastapi import APIRouter
from app.ml.engine import generate_signals

router = APIRouter(prefix="/strategy", tags=["strategy"])

@router.get("/signals")
def get_signals():
    return generate_signals()
