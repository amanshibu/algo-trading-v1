"""
CRUD Helpers
============
All database read/write operations in one place, consumed by routes and the paper trader.
"""

import secrets
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.models import User, Session as DBSession, Portfolio, Position, TradeHistory

INITIAL_BALANCE = 100_000.0


# ===========================================================================
# User
# ===========================================================================

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, name: str, email: str, password_hash: str, salt: str) -> User:
    user = User(name=name, email=email, password_hash=password_hash, salt=salt, balance=0.0)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_balance(db: Session, user: User, new_balance: float) -> User:
    user.balance = new_balance
    db.commit()
    db.refresh(user)
    return user


# ===========================================================================
# Sessions / Tokens
# ===========================================================================

def create_token(db: Session, user: User) -> str:
    token = f"token-{user.id}-{secrets.token_hex(8)}"
    sess = DBSession(user_id=user.id, token=token)
    db.add(sess)
    db.commit()
    return token


def get_user_by_token(db: Session, token: str) -> Optional[User]:
    sess = db.query(DBSession).filter(DBSession.token == token).first()
    if not sess:
        return None
    return db.query(User).filter(User.id == sess.user_id).first()


# ===========================================================================
# Portfolio
# ===========================================================================

def get_or_create_portfolio(db: Session, email: str) -> Portfolio:
    pf = db.query(Portfolio).filter(Portfolio.user_email == email).first()
    if not pf:
        pf = Portfolio(user_email=email, balance=INITIAL_BALANCE, peak_net_worth=INITIAL_BALANCE)
        db.add(pf)
        db.commit()
        db.refresh(pf)
    return pf


def update_portfolio_balance(db: Session, portfolio: Portfolio, balance: float,
                              peak_net_worth: Optional[float] = None) -> Portfolio:
    portfolio.balance = balance
    if peak_net_worth is not None:
        portfolio.peak_net_worth = peak_net_worth
    db.commit()
    db.refresh(portfolio)
    return portfolio


def reset_portfolio(db: Session, email: str) -> Portfolio:
    pf = get_or_create_portfolio(db, email)
    # Delete all positions and history
    db.query(Position).filter(Position.portfolio_id == pf.id).delete()
    db.query(TradeHistory).filter(TradeHistory.portfolio_id == pf.id).delete()
    pf.balance = INITIAL_BALANCE
    pf.peak_net_worth = INITIAL_BALANCE
    db.commit()
    db.refresh(pf)
    return pf


# ===========================================================================
# Positions
# ===========================================================================

def get_positions(db: Session, portfolio_id: int) -> list[Position]:
    return db.query(Position).filter(Position.portfolio_id == portfolio_id).all()


def add_position(db: Session, portfolio_id: int, ticker: str, action: str,
                 qty: int, entry_price: float, entry_time: str, cost: float,
                 price_source: str) -> Position:
    pos = Position(
        portfolio_id=portfolio_id,
        ticker=ticker,
        action=action,
        qty=qty,
        entry_price=entry_price,
        entry_time=entry_time,
        cost=cost,
        price_source=price_source,
    )
    db.add(pos)
    db.commit()
    db.refresh(pos)
    return pos


def remove_position(db: Session, position: Position) -> None:
    db.delete(position)
    db.commit()


# ===========================================================================
# Trade History
# ===========================================================================

def get_trade_history(db: Session, portfolio_id: int, limit: int = 20) -> list[TradeHistory]:
    return (
        db.query(TradeHistory)
        .filter(TradeHistory.portfolio_id == portfolio_id)
        .order_by(TradeHistory.id.desc())
        .limit(limit)
        .all()
    )


def add_trade_history(db: Session, portfolio_id: int, ticker: str, action: str,
                      qty: int, entry_price: float, exit_price: float,
                      entry_time: str, exit_time: str, pnl: float,
                      price_source: str) -> TradeHistory:
    trade = TradeHistory(
        portfolio_id=portfolio_id,
        ticker=ticker,
        action=action,
        qty=qty,
        entry_price=entry_price,
        exit_price=exit_price,
        entry_time=entry_time,
        exit_time=exit_time,
        pnl=pnl,
        price_source=price_source,
    )
    db.add(trade)
    db.commit()
    db.refresh(trade)
    return trade


def get_total_realised_pnl(db: Session, portfolio_id: int) -> float:
    result = db.query(func.sum(TradeHistory.pnl)).filter(
        TradeHistory.portfolio_id == portfolio_id
    ).scalar()
    return result or 0.0
