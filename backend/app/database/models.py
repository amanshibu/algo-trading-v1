"""
SQLAlchemy ORM Models
=====================
Defines all database tables for the Algo Trading Platform.
"""

from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class User(Base):
    """Stores registered users with hashed passwords and cash balance."""
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(120), nullable=False)
    email         = Column(String(200), unique=True, index=True, nullable=False)
    password_hash = Column(String(64), nullable=False)
    salt          = Column(String(64), nullable=False)  # token_hex(16)=32 chars; 64 gives headroom
    balance       = Column(Float, default=0.0, nullable=False)

    sessions  = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    portfolio = relationship("Portfolio", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Session(Base):
    """Bearer tokens — one user can have multiple active sessions."""
    __tablename__ = "sessions"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    token      = Column(String(60), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="sessions")


class Portfolio(Base):
    """Paper trading portfolio per user — balance, open positions, history."""
    __tablename__ = "portfolios"

    id             = Column(Integer, primary_key=True, index=True)
    user_email     = Column(String(200), ForeignKey("users.email"), unique=True, nullable=False)
    balance        = Column(Float, default=100_000.0, nullable=False)
    peak_net_worth = Column(Float, default=100_000.0, nullable=False)  # for trailing SL

    user      = relationship("User", back_populates="portfolio")
    positions = relationship("Position", back_populates="portfolio", cascade="all, delete-orphan")
    history   = relationship("TradeHistory", back_populates="portfolio", cascade="all, delete-orphan")


class Position(Base):
    """An open paper trading position."""
    __tablename__ = "positions"

    id           = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    ticker       = Column(String(30), nullable=False)
    action       = Column(String(10), nullable=False)   # "BUY" | "SELL"
    qty          = Column(Integer, nullable=False)
    entry_price  = Column(Float, nullable=False)
    entry_time   = Column(String(30), nullable=False)
    cost         = Column(Float, nullable=False)
    price_source = Column(String(10), nullable=False, default="DELAYED")

    portfolio = relationship("Portfolio", back_populates="positions")


class TradeHistory(Base):
    """A closed paper trade (realised P&L)."""
    __tablename__ = "trade_history"

    id           = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    ticker       = Column(String(30), nullable=False)
    action       = Column(String(10), nullable=False)
    qty          = Column(Integer, nullable=False)
    entry_price  = Column(Float, nullable=False)
    exit_price   = Column(Float, nullable=False)
    entry_time   = Column(String(30), nullable=False)
    exit_time    = Column(String(30), nullable=False)
    pnl          = Column(Float, nullable=False)
    price_source = Column(String(10), nullable=False, default="DELAYED")

    portfolio = relationship("Portfolio", back_populates="history")
