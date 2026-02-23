from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

from app.routes.health import router as health_router
from app.routes.strategy import router as strategy_router
from app.routes.dashboard import router as dashboard_router

from app.routes.auth import router as auth_router
from app.routes.portfolio import router as portfolio_router


load_dotenv()

# =========================
# Create FastAPI app FIRST
# =========================
app = FastAPI(
    title="Algo Trading Platform",
    version="0.1.0"
)

# =========================
# CORS (for frontend dev)
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# API Routers
# =========================
app.include_router(health_router)      # /health
app.include_router(strategy_router)    # /strategy/*
app.include_router(dashboard_router)   # /admin/dashboard
app.include_router(auth_router)       # /auth/*
app.include_router(portfolio_router)  # /portfolio/*
# =========================
# Frontend (after build)
# =========================
app.mount(
    "/assets",
    StaticFiles(directory="app/static/assets"),
    name="assets"
)

@app.get("/")
def serve_frontend():
    return FileResponse("app/static/index.html")
