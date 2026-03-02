"""
Realistic Paper Trading Engine (AngelOne-powered)
===================================================

Improvements over old version:
  1. Uses AngelOne SmartAPI LTP for live prices during market hours
  2. Falls back to yfinance when AngelOne isn't configured or market is closed
  3. Enforces market hours (NSE: 9:15 AM – 3:30 PM IST, Mon-Fri)
  4. Every response includes price_source: "LIVE" | "DELAYED" | "CLOSED"
  5. Symbol token map covers all stocks used in the ML engine
"""

import os
import pytz
import yfinance as yf
from datetime import datetime, time
from typing import Optional

# ============================================================
# NSE Symbol Token Map (AngelOne → ltpData needs this)
# Full list: https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json
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

INITIAL_BALANCE = 100_000.0   # ₹1,00,000

IST = pytz.timezone("Asia/Kolkata")

# In-memory portfolio store  { email: { balance, positions, history } }
_portfolios: dict[str, dict] = {}


# ============================================================
# Market Hours
# ============================================================

def _is_market_open() -> bool:
    """NSE pre-open: 9:00 AM. Regular session: 9:15 AM – 3:30 PM, Mon–Fri."""
    now = datetime.now(IST)
    if now.weekday() >= 5:          # Saturday = 5, Sunday = 6
        return False
    market_start = time(9, 15)
    market_end   = time(15, 30)
    return market_start <= now.time() <= market_end


def _market_status() -> dict:
    """Returns current market status with next open time."""
    now = datetime.now(IST)
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
    now = datetime.now(IST)
    target = now.replace(hour=h, minute=m, second=0, microsecond=0)
    delta = (target - now).total_seconds()
    return max(0, int(delta // 60))


# ============================================================
# Price Fetching  (AngelOne first → yfinance fallback)
# ============================================================

def _ticker_to_angelone(ticker: str) -> tuple[str, str]:
    """Convert 'HDFCBANK.NS' → ('HDFCBANK-EQ', '1333')."""
    base = ticker.replace(".NS", "").replace(".BO", "")
    angel_symbol = f"{base}-EQ"
    token = SYMBOL_TOKEN_MAP.get(angel_symbol, "")
    return angel_symbol, token


def _get_price_from_angelone(ticker: str) -> Optional[float]:
    """Fetch LTP from AngelOne. Returns None on any failure."""
    try:
        required = ["ANGELONE_CLIENT_ID", "ANGELONE_PIN", "ANGELONE_TOTP_SECRET"]
        if any(not os.getenv(k, "").strip() for k in required):
            return None                   # Not configured

        from app.trading.angelone_broker import get_session
        session, _ = get_session()

        angel_symbol, token = _ticker_to_angelone(ticker)
        if not token:
            return None                   # Unknown symbol token

        result = session.ltpData("NSE", angel_symbol, token)
        if result and result.get("status") and result.get("data"):
            return float(result["data"]["ltp"])
        return None
    except Exception:
        return None


def _get_price_from_yfinance(ticker: str) -> float:
    """Fetch last known price using yfinance (works even after market close)."""
    try:
        yf_ticker = ticker if ".NS" in ticker else f"{ticker}.NS"
        data = yf.download(yf_ticker, period="5d", interval="1d", progress=False)["Close"]
        if hasattr(data, "columns"):
            data = data.iloc[:, 0]
        data = data.dropna()
        return float(data.iloc[-1]) if len(data) > 0 else 0.0
    except Exception:
        return 0.0


def get_live_price(ticker: str) -> tuple[float, str]:
    """
    Returns (price, source) where source is:
      "LIVE"    → from AngelOne during market hours
      "DELAYED" → from yfinance (market open but AngelOne not configured)
      "CLOSED"  → last known price, market is closed
    """
    if _is_market_open():
        angel_price = _get_price_from_angelone(ticker)
        if angel_price and angel_price > 0:
            return angel_price, "LIVE"
        # Fallback to yfinance if AngelOne not configured
        return _get_price_from_yfinance(ticker), "DELAYED"
    else:
        # Market closed — return last known (yfinance daily)
        return _get_price_from_yfinance(ticker), "CLOSED"


# ============================================================
# Portfolio Management
# ============================================================

def _get_user_portfolio(email: str) -> dict:
    if email not in _portfolios:
        _portfolios[email] = {
            "balance":   INITIAL_BALANCE,
            "positions": [],
            "history":   [],
        }
    return _portfolios[email]


def get_portfolio(email: str) -> dict:
    """Returns the paper portfolio with live P&L and market status."""
    user_portfolio = _get_user_portfolio(email)
    positions_with_pnl = []
    total_unrealised = 0.0

    for pos in user_portfolio["positions"]:
        price, source = get_live_price(pos["ticker"])
        if pos["action"] == "BUY":
            pnl = (price - pos["entry_price"]) * pos["qty"]
        else:
            pnl = (pos["entry_price"] - price) * pos["qty"]

        total_unrealised += pnl
        positions_with_pnl.append({
            **pos,
            "current_price":  round(price, 2),
            "price_source":   source,
            "unrealised_pnl": round(pnl, 2),
        })

    total_realised = sum(t.get("pnl", 0) for t in user_portfolio["history"])

    return {
        "balance":              round(user_portfolio["balance"], 2),
        "initial_balance":      INITIAL_BALANCE,
        "positions":            positions_with_pnl,
        "history":              user_portfolio["history"][-20:],
        "total_unrealised_pnl": round(total_unrealised, 2),
        "total_realised_pnl":   round(total_realised, 2),
        "net_worth":            round(user_portfolio["balance"] + total_unrealised, 2),
        "market":               _market_status(),
    }


def execute_trade(email: str, ticker: str, action: str, qty: int = 1) -> dict:
    """
    Execute a paper trade.
    - Blocks trading when market is closed (realistic behaviour).
    - Uses AngelOne LTP when available, yfinance otherwise.
    - CLOSE action works even outside market hours (realistic).
    """
    user_portfolio = _get_user_portfolio(email)
    now_ist = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S IST")

    # CLOSE works any time (closing positions can happen via AMO etc.)
    if action == "CLOSE":
        return _close_position(email, user_portfolio, ticker, now_ist)

    # --- Market Hours Check ---
    if not _is_market_open():
        status = _market_status()
        return {
            "error":  "Market is closed. Paper trades simulate real market conditions.",
            "market": status,
            "hint":   "NSE Regular Session: Mon–Fri, 9:15 AM – 3:30 PM IST"
        }

    # --- Fetch Price ---
    live_price, price_source = get_live_price(ticker)

    if live_price <= 0:
        return {"error": f"Could not fetch price for {ticker}. Please try again."}

    cost = live_price * qty

    if cost > user_portfolio["balance"]:
        return {
            "error": f"Insufficient balance. Need ₹{cost:,.2f}, have ₹{user_portfolio['balance']:,.2f}"
        }

    # --- Open Position ---
    yf_ticker = ticker if ".NS" in ticker else f"{ticker}.NS"
    user_portfolio["balance"] -= cost

    position = {
        "ticker":      yf_ticker,
        "action":      action,
        "qty":         qty,
        "entry_price": round(live_price, 2),
        "entry_time":  now_ist,
        "cost":        round(cost, 2),
        "price_source": price_source,
    }
    user_portfolio["positions"].append(position)

    return {
        "status":            "executed",
        "mode":              "PAPER",
        "trade":             position,
        "price_source":      price_source,
        "remaining_balance": round(user_portfolio["balance"], 2),
        "market":            _market_status(),
    }


def _close_position(email: str, user_portfolio: dict, ticker: str, now_ist: str) -> dict:
    """Close the first matching open position and realise P&L."""
    yf_ticker = ticker if ".NS" in ticker else f"{ticker}.NS"

    for i, pos in enumerate(user_portfolio["positions"]):
        if pos["ticker"] == yf_ticker:
            exit_price, source = get_live_price(yf_ticker)

            if pos["action"] == "BUY":
                pnl = (exit_price - pos["entry_price"]) * pos["qty"]
            else:
                pnl = (pos["entry_price"] - exit_price) * pos["qty"]

            user_portfolio["balance"] += pos["cost"] + pnl
            user_portfolio["history"].append({
                "ticker":       pos["ticker"],
                "action":       pos["action"],
                "qty":          pos["qty"],
                "entry_price":  pos["entry_price"],
                "exit_price":   round(exit_price, 2),
                "entry_time":   pos["entry_time"],
                "exit_time":    now_ist,
                "pnl":          round(pnl, 2),
                "price_source": source,
            })
            user_portfolio["positions"].pop(i)

            return {
                "status":            "closed",
                "mode":              "PAPER",
                "pnl":               round(pnl, 2),
                "exit_price":        round(exit_price, 2),
                "price_source":      source,
                "remaining_balance": round(user_portfolio["balance"], 2),
                "market":            _market_status(),
            }

    return {"error": f"No open position found for {ticker}"}


def add_virtual_funds(email: str, amount: float) -> dict:
    user_portfolio = _get_user_portfolio(email)
    if amount <= 0:
        return {"error": "Amount must be positive"}
    user_portfolio["balance"] += amount
    return {"balance": round(user_portfolio["balance"], 2), "added": amount}


def reset_portfolio(email: str) -> dict:
    user_portfolio = _get_user_portfolio(email)
    user_portfolio["balance"]   = INITIAL_BALANCE
    user_portfolio["positions"] = []
    user_portfolio["history"]   = []
    return {"status": "reset", "balance": INITIAL_BALANCE}
