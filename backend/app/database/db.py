"""
Database Engine & Session
=========================
- SQLite database stored at backend/trading.db
- `get_db` is a FastAPI dependency that yields a session per request
- `init_db` creates all tables on first startup
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.database.models import Base

# SQLite file lives next to the backend directory (backend/trading.db)
DATABASE_URL = "sqlite:///./trading.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},   # required for SQLite with FastAPI
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Create all tables if they don't exist yet. Called on app startup."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency — yields a SQLAlchemy session and closes it after the request."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
