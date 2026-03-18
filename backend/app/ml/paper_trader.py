"""
Realistic Paper Trading Engine (DB-backed)
==========================================

All portfolio state (balance, positions, history, peak net worth) is now
persisted in SQLite via SQLAlchemy so nothing is lost across restarts.

Every public function receives a `db: Session` argument from the caller
(route handler or auto_trader background loop).
"""

import os
import pytz
import pandas as pd
import yfinance as yf
from datetime import datetime, time
from typing import Optional
from sqlalchemy.orm import Session

from app.database import crud
from app.ml.cache import ttl_cache

# ============================================================
# NSE Symbol Token Map
# ============================================================
SYMBOL_TOKEN_MAP: dict[str, str] = {
    "HDFCBANK-EQ":  "1333",
    "ICICIBANK-EQ": "4963",
    "SBIN-EQ":      "3045",
    "KOTAKBANK-EQ": "1922",
    "TCS-EQ":       "11536",
    "INFY-EQ":      "1594",
    "HCLTECH-EQ":   "7229",
    "WIPRO-EQ":     "3787",
    "RELIANCE-EQ":  "2885",
    "NIFTYBEES-EQ": "13635",
}

INITIAL_BALANCE = 100_000.0

RISK_CONFIG = {
    "stop_loss_pct": 5.0,
    "enabled":       True,
}

IST = pytz.timezone("Asia/Kolkata")


# ============================================================
# Market Hours
# ============================================================

def _is_market_open() -> bool:
    now = datetime.now(IST)
    if now.weekday() >= 5:
        return False
    market_start = time(9, 15)
    market_end   = time(15, 30)
    return market_start <= now.time() <= market_end


def _market_status() -> dict:
    now   = datetime.now(IST)
    open_ = _is_market_open()
    if now.weekday() >= 5:
        msg = "Market closed — Weekend"
    elif now.time() < time(9, 15):
        msg = f"Market opens at 9:15 AM IST (in {_minutes_until(9, 15)} min)"
    elif now.time() > time(15, 30):
        msg = "Market closed for today — Opens tomorrow 9:15 AM IST"
    else:
        msg = "Market OPEN"
    return {"is_open": open_, "message": msg, "time_ist": now.strftime("%H:%M:%S IST")}


def _minutes_until(h: int, m: int) -> int:
    now    = datetime.now(IST)
    target = now.replace(hour=h, minute=m, second=0, microsecond=0)
    delta  = (target - now).total_seconds()
    return max(0, int(delta // 60))


# ============================================================
# Price Fetching  (AngelOne first → yfinance fallback)
# ============================================================

def _ticker_to_angelone(ticker: str) -> tuple[str, str]:
    base         = ticker.replace(".NS", "").replace(".BO", "")
    angel_symbol = f"{base}-EQ"
    token        = SYMBOL_TOKEN_MAP.get(angel_symbol, "")
    return angel_symbol, token

@ttl_cache(ttl_seconds=60)
def _get_price_from_angelone(ticker: str) -> Optional[float]:
    try:
        required = ["ANGELONE_CLIENT_ID", "ANGELONE_PIN", "ANGELONE_TOTP_SECRET"]
        if any(not os.getenv(k, "").strip() for k in required):
            return None
        from app.trading.angelone_broker import get_session
        session, _ = get_session()
        angel_symbol, token = _ticker_to_angelone(ticker)
        if not token:
            return None
        result = session.ltpData("NSE", angel_symbol, token)
        if result and result.get("status") and result.get("data"):
            return float(result["data"]["ltp"])
        return None
    except Exception:
        return None


@ttl_cache(ttl_seconds=60)
def _get_price_from_yfinance(ticker: str) -> float:
    try:
        yf_ticker = ticker if ".NS" in ticker else f"{ticker}.NS"
        info = yf.Ticker(yf_ticker).fast_info
        return float(info["last_price"])
    except Exception as e:
        print(f"[PaperTrader] yfinance error for {ticker}: {e}")
        return 0.0


def get_live_price(ticker: str) -> tuple[float, str]:
    if _is_market_open():
        angel_price = _get_price_from_angelone(ticker)
        if angel_price and angel_price > 0:
            return angel_price, "LIVE"
        return _get_price_from_yfinance(ticker), "DELAYED"
    else:
        return _get_price_from_yfinance(ticker), "CLOSED"


# ============================================================
# Portfolio Management (DB-backed)
# ============================================================

def get_portfolio(email: str, db: Session) -> dict:
    """Returns the paper portfolio with live P&L and market status."""
    pf     = crud.get_or_create_portfolio(db, email)
    raw_positions = crud.get_positions(db, pf.id)

    positions_with_pnl = []
    total_unrealised   = 0.0

    for pos in raw_positions:
        price, source = get_live_price(pos.ticker)
        
        # Fallback if price is 0 so it doesn't crash the portfolio value
        if price <= 0:
            price = pos.entry_price
            source = "FALLBACK"
            
        if pos.action == "BUY":
            pnl = (price - pos.entry_price) * pos.qty
        else:
            pnl = (pos.entry_price - price) * pos.qty

        total_unrealised += pnl
        positions_with_pnl.append({
            "ticker":         pos.ticker,
            "action":         pos.action,
            "qty":            pos.qty,
            "entry_price":    pos.entry_price,
            "entry_time":     pos.entry_time,
            "cost":           pos.cost,
            "price_source":   pos.price_source,
            "current_price":  round(price, 2),
            "unrealised_pnl": round(pnl, 2),
        })

    raw_history    = crud.get_trade_history(db, pf.id, limit=20)
    total_realised = crud.get_total_realised_pnl(db, pf.id)

    history_list = [
        {
            "ticker":       t.ticker,
            "action":       t.action,
            "qty":          t.qty,
            "entry_price":  t.entry_price,
            "exit_price":   t.exit_price,
            "entry_time":   t.entry_time,
            "exit_time":    t.exit_time,
            "pnl":          t.pnl,
            "price_source": t.price_source,
        }
        for t in raw_history
    ]

    return {
        "balance":              round(pf.balance, 2),
        "initial_balance":      INITIAL_BALANCE,
        "positions":            positions_with_pnl,
        "history":              history_list,
        "total_unrealised_pnl": round(total_unrealised, 2),
        "total_realised_pnl":   round(total_realised, 2),
        "net_worth":            round(pf.balance + total_unrealised, 2),
        "market":               _market_status(),
    }


def execute_trade(email: str, ticker: str, action: str, qty: int = 1,
                  db: Session = None) -> dict:
    """
    Execute a paper trade.
    - Blocks new BUY/SELL when market is closed.
    - CLOSE works any time.
    """
    # Initialise BEFORE the try block so finally never hits NameError
    _close_session = False
    if db is None:
        from app.database.db import SessionLocal
        db = SessionLocal()
        _close_session = True

    try:
        pf      = crud.get_or_create_portfolio(db, email)
        now_ist = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S IST")

        if action == "CLOSE":
            return _close_position(email, pf, ticker, now_ist, db)

        if not _is_market_open():
            return {
                "error":  "Market is closed. Paper trades simulate real market conditions.",
                "market": _market_status(),
                "hint":   "NSE Regular Session: Mon–Fri, 9:15 AM – 3:30 PM IST",
            }

        live_price, price_source = get_live_price(ticker)
        if live_price <= 0:
            return {"error": f"Could not fetch price for {ticker}. Please try again."}

        cost = live_price * qty
        if cost > pf.balance:
            return {
                "error": f"Insufficient balance. Need ₹{cost:,.2f}, have ₹{pf.balance:,.2f}"
            }

        # Deduct balance
        crud.update_portfolio_balance(db, pf, pf.balance - cost)

        yf_ticker = ticker if ".NS" in ticker else f"{ticker}.NS"
        position  = crud.add_position(
            db, pf.id, yf_ticker, action, qty,
            round(live_price, 2), now_ist, round(cost, 2), price_source,
        )

        return {
            "status":            "executed",
            "mode":              "PAPER",
            "trade": {
                "ticker":       position.ticker,
                "action":       position.action,
                "qty":          position.qty,
                "entry_price":  position.entry_price,
                "entry_time":   position.entry_time,
                "cost":         position.cost,
                "price_source": position.price_source,
            },
            "price_source":      price_source,
            "remaining_balance": round(pf.balance, 2),
            "market":            _market_status(),
        }
    finally:
        if _close_session:
            db.close()


def _close_position(email: str, pf, ticker: str, now_ist: str, db: Session) -> dict:
    """Close the first matching open position and realise P&L."""
    yf_ticker = ticker if ".NS" in ticker else f"{ticker}.NS"
    positions = crud.get_positions(db, pf.id)

    for pos in positions:
        if pos.ticker == yf_ticker:
            exit_price, source = get_live_price(yf_ticker)
            if exit_price <= 0:
                return {"error": f"Could not fetch live price to close {ticker}. Try again."}
                
            if pos.action == "BUY":
                pnl = (exit_price - pos.entry_price) * pos.qty
            else:
                pnl = (pos.entry_price - exit_price) * pos.qty

            new_balance = pf.balance + pos.cost + pnl
            crud.update_portfolio_balance(db, pf, new_balance)
            crud.add_trade_history(
                db, pf.id, pos.ticker, pos.action, pos.qty,
                pos.entry_price, round(exit_price, 2),
                pos.entry_time, now_ist, round(pnl, 2), source,
            )
            crud.remove_position(db, pos)

            return {
                "status":            "closed",
                "mode":              "PAPER",
                "pnl":               round(pnl, 2),
                "exit_price":        round(exit_price, 2),
                "price_source":      source,
                "remaining_balance": round(new_balance, 2),
                "market":            _market_status(),
            }

    return {"error": f"No open position found for {ticker}"}


def add_virtual_funds(email: str, amount: float, db: Session) -> dict:
    if amount <= 0:
        return {"error": "Amount must be positive"}
    pf = crud.get_or_create_portfolio(db, email)
    updated = crud.update_portfolio_balance(db, pf, pf.balance + amount)
    return {"balance": round(updated.balance, 2), "added": amount}


def reset_portfolio(email: str, db: Session) -> dict:
    crud.reset_portfolio(db, email)
    return {"status": "reset", "balance": INITIAL_BALANCE}


# ============================================================
# Risk Management — Trailing Stop-Loss
# ============================================================

def get_margin_status(email: str, db: Session) -> dict:
    """
    Returns margin health and whether the trailing SL has fired.

    Trailing SL:
      - peak_net_worth only ever moves UP
      - SL level = peak × (1 − stop_loss_pct / 100)
      - stop_loss_hit when net_worth <= SL level
    """
    pf_data   = get_portfolio(email, db)
    net_worth = pf_data["net_worth"]

    pf  = crud.get_or_create_portfolio(db, email)
    peak = pf.peak_net_worth
    if net_worth > peak:
        peak = net_worth
        crud.update_portfolio_balance(db, pf, pf.balance, peak_net_worth=peak)

    sl_pct   = RISK_CONFIG["stop_loss_pct"]
    sl_level = round(peak * (1 - sl_pct / 100), 2)

    return {
        "net_worth":       round(net_worth, 2),
        "peak_net_worth":  round(peak, 2),
        "stop_loss_level": sl_level,
        "stop_loss_pct":   sl_pct,
        "stop_loss_hit":   net_worth <= sl_level and RISK_CONFIG["enabled"],
        "risk_config":     RISK_CONFIG,
    }


def close_all_positions(email: str, db: Session, reason: str = "RISK_TRIGGER") -> dict:
    """Immediately close every open position. Used by auto_trader on trailing-SL fires."""
    pf       = crud.get_or_create_portfolio(db, email)
    positions = crud.get_positions(db, pf.id)
    tickers  = [p.ticker for p in positions]
    now_ist  = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S IST")
    results  = []
    for ticker in tickers:
        res = _close_position(email, pf, ticker, now_ist, db)
        results.append({"ticker": ticker, **res})
    return {
        "reason":  reason,
        "closed":  len(results),
        "details": results,
    }
