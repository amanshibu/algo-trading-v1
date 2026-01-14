from fastapi import APIRouter
import os

router = APIRouter()

@router.get("/health", tags=["system"])
def health():
    return {
        "status": "ok",
        "environment": os.getenv("ENV", "development")
    }
