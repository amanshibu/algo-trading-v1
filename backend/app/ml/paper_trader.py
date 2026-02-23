"""
Paper Trading Engine

Manages a virtual portfolio for paper trading.
Works independently of the auth system — anyone can paper trade.
Tracks: balance, positions, trade history, P&L.
"""

import yfinance as yf
from datetime import datetime

# ============================================
# In-memory paper portfolio (global singleton)
# ============================================

INITIAL_BALANCE = 100000.0  # ₹1,00,000

_portfolio = {
    "balance": INITIAL_BALANCE,
    "positions": [],   # [{ ticker, action, qty, entry_price, entry_time }]
    "history": [],     # closed trades
}


def get_portfolio():
    """Returns the current paper portfolio state with live P&L."""
    positions_with_pnl = []
    total_unrealised = 0.0

    for pos in _portfolio["positions"]:
        current_price = _get_live_price(pos["ticker"])
        if pos["action"] == "BUY":
            pnl = (current_price - pos["entry_price"]) * pos["qty"]
        else:  # SELL (short)
            pnl = (pos["entry_price"] - current_price) * pos["qty"]

        total_unrealised += pnl
        positions_with_pnl.append({
            **pos,
            "current_price": round(current_price, 2),
            "unrealised_pnl": round(pnl, 2),
        })

    # Calculate realised P&L from closed trades
    total_realised = sum(t.get("pnl", 0) for t in _portfolio["history"])

    return {
        "balance": round(_portfolio["balance"], 2),
        "initial_balance": INITIAL_BALANCE,
        "positions": positions_with_pnl,
        "history": _portfolio["history"][-20:],  # last 20 trades
        "total_unrealised_pnl": round(total_unrealised, 2),
        "total_realised_pnl": round(total_realised, 2),
        "net_worth": round(_portfolio["balance"] + total_unrealised, 2),
    }


def execute_trade(ticker: str, action: str, qty: int = 1):
    """
    Execute a paper trade.
    - BUY: deduct entry_price * qty from balance, add to positions
    - SELL: deduct entry_price * qty from balance (short), add to positions
    - CLOSE: close an existing position and realise P&L
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Handle CLOSE — find and close a matching position
    if action == "CLOSE":
        return _close_position(ticker, now)

    # Get live price
    yf_ticker = ticker if ".NS" in ticker else f"{ticker}.NS"
    live_price = _get_live_price(yf_ticker)

    if live_price <= 0:
        return {"error": f"Could not fetch price for {ticker}"}

    cost = live_price * qty

    # Check balance
    if cost > _portfolio["balance"]:
        return {"error": f"Insufficient balance. Need ₹{cost:,.2f} but have ₹{_portfolio['balance']:,.2f}"}

    # Deduct balance and open position
    _portfolio["balance"] -= cost
    position = {
        "ticker": yf_ticker,
        "action": action,
        "qty": qty,
        "entry_price": round(live_price, 2),
        "entry_time": now,
        "cost": round(cost, 2),
    }
    _portfolio["positions"].append(position)

    return {
        "status": "executed",
        "trade": position,
        "remaining_balance": round(_portfolio["balance"], 2),
    }


def _close_position(ticker: str, now: str):
    """Close the first matching position for a ticker."""
    yf_ticker = ticker if ".NS" in ticker else f"{ticker}.NS"

    for i, pos in enumerate(_portfolio["positions"]):
        if pos["ticker"] == yf_ticker:
            current_price = _get_live_price(yf_ticker)
            if pos["action"] == "BUY":
                pnl = (current_price - pos["entry_price"]) * pos["qty"]
            else:
                pnl = (pos["entry_price"] - current_price) * pos["qty"]

            # Return the cost + P&L to balance
            _portfolio["balance"] += pos["cost"] + pnl

            # Record in history
            _portfolio["history"].append({
                "ticker": pos["ticker"],
                "action": pos["action"],
                "qty": pos["qty"],
                "entry_price": pos["entry_price"],
                "exit_price": round(current_price, 2),
                "entry_time": pos["entry_time"],
                "exit_time": now,
                "pnl": round(pnl, 2),
            })

            # Remove from active positions
            _portfolio["positions"].pop(i)

            return {
                "status": "closed",
                "pnl": round(pnl, 2),
                "remaining_balance": round(_portfolio["balance"], 2),
            }

    return {"error": f"No open position found for {ticker}"}


def add_virtual_funds(amount: float):
    """Add virtual money to the paper trading balance."""
    if amount <= 0:
        return {"error": "Amount must be positive"}
    _portfolio["balance"] += amount
    return {
        "balance": round(_portfolio["balance"], 2),
        "added": amount,
    }


def reset_portfolio():
    """Reset the paper portfolio to its initial state."""
    _portfolio["balance"] = INITIAL_BALANCE
    _portfolio["positions"] = []
    _portfolio["history"] = []
    return {"status": "reset", "balance": INITIAL_BALANCE}


def _get_live_price(ticker: str) -> float:
    """Fetch the latest price for a ticker from yfinance."""
    try:
        data = yf.download(ticker, period="1d", interval="1m", progress=False)["Close"]
        if hasattr(data, 'columns'):
            data = data.iloc[:, 0] if len(data.columns) > 0 else data
        data = data.dropna()
        if len(data) > 0:
            return float(data.iloc[-1])
        # fallback to daily data
        data = yf.download(ticker, period="5d", interval="1d", progress=False)["Close"]
        if hasattr(data, 'columns'):
            data = data.iloc[:, 0] if len(data.columns) > 0 else data
        data = data.dropna()
        return float(data.iloc[-1]) if len(data) > 0 else 0.0
    except Exception:
        return 0.0
