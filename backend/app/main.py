from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routes.health import router as health_router
from app.routes.strategy import router as strategy_router  # 👈 strategy API
from app.routes.dashboard import router as dashboard_router  # 👈 admin UI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI(
    title="Algo Trading Platform",
    version="0.1.0"
)

# CORS (frontend / future dashboard safe)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # later restrict
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Include Routers
# =========================
app.include_router(health_router)           # /health
app.include_router(strategy_router)         # /strategy/*
app.include_router(dashboard_router)        # /admin/dashboard
