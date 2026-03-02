"""
AngelOne SmartAPI Broker Integration
=====================================
Handles: authentication, session management, order placement,
         live price lookup, portfolio / positions retrieval.

Required environment variables (.env):
  ANGELONE_API_KEY      — from SmartAPI portal (yours: 1mtBYGMu)
  ANGELONE_CLIENT_ID    — your Angel One client ID (e.g. A12345)
  ANGELONE_PIN          — your 4-digit MPIN
  ANGELONE_TOTP_SECRET  — TOTP secret string from SmartAPI portal

Install dependencies:
  pip install smartapi-python pyotp
"""

import os
import pyotp
from SmartApi import SmartConnect


# -------------------------------------------------------
# Session Management (singleton per process)
# -------------------------------------------------------

_session: SmartConnect | None = None
_session_tokens: dict = {}


def _create_session() -> tuple[SmartConnect, dict]:
    """
    Authenticate with AngelOne SmartAPI and return
    a connected SmartConnect object + token dict.
    Raises RuntimeError if any env var is missing.
    """
    api_key   = os.getenv("ANGELONE_API_KEY")
    client_id = os.getenv("ANGELONE_CLIENT_ID")
    pin       = os.getenv("ANGELONE_PIN")
    totp_secret = os.getenv("ANGELONE_TOTP_SECRET")

    missing = [k for k, v in {
        "ANGELONE_API_KEY":     api_key,
        "ANGELONE_CLIENT_ID":   client_id,
        "ANGELONE_PIN":         pin,
        "ANGELONE_TOTP_SECRET": totp_secret,
    }.items() if not v or not v.strip()]

    if missing:
        raise RuntimeError(
            f"AngelOne credentials not configured. "
            f"Missing in .env: {', '.join(missing)}. "
            "Please fill in y:\\Mini_Project\\backend\\.env"
        )

    obj = SmartConnect(api_key=api_key)
    totp = pyotp.TOTP(totp_secret).now()
    data = obj.generateSession(client_id, pin, totp)

    if not data or data.get("status") is False:
        raise ConnectionError(
            f"AngelOne login failed: {data.get('message', 'unknown error')}"
        )

    tokens = {
        "auth_token":    data["data"]["jwtToken"],
        "refresh_token": data["data"]["refreshToken"],
        "feed_token":    obj.getfeedToken(),
    }
    return obj, tokens


def get_session() -> tuple[SmartConnect, dict]:
    """
    Returns a (possibly cached) authenticated session.
    Call this from route handlers.
    """
    global _session, _session_tokens
    if _session is None:
        _session, _session_tokens = _create_session()
    return _session, _session_tokens


def refresh_session() -> tuple[SmartConnect, dict]:
    """Force a new login (e.g. after token expiry)."""
    global _session, _session_tokens
    _session = None
    _session_tokens = {}
    return get_session()


# -------------------------------------------------------
# Orders
# -------------------------------------------------------

def place_order(
    tradingsymbol: str,
    symboltoken: str,
    exchange: str,
    action: str,           # "BUY" or "SELL"
    qty: int,
    order_type: str = "MARKET",
    product: str = "INTRADAY",
    price: float = 0,
) -> dict:
    """
    Place a real order via AngelOne SmartAPI.

    Parameters
    ----------
    tradingsymbol : e.g. "RELIANCE-EQ"
    symboltoken   : e.g. "2885"   (from AngelOne instrument list)
    exchange      : "NSE" | "BSE" | "NFO" | "MCX"
    action        : "BUY" | "SELL"
    qty           : number of shares
    order_type    : "MARKET" | "LIMIT" | "SL" | "SL-M"
    product       : "INTRADAY" | "DELIVERY" | "CARRYFORWARD"
    price         : required for LIMIT orders, 0 for MARKET
    """
    session, _ = get_session()

    order_params = {
        "variety":         "NORMAL",
        "tradingsymbol":   tradingsymbol,
        "symboltoken":     symboltoken,
        "transactiontype": action.upper(),
        "exchange":        exchange.upper(),
        "ordertype":       order_type.upper(),
        "producttype":     product.upper(),
        "duration":        "DAY",
        "quantity":        str(qty),
        "price":           str(price),
        "triggerprice":    "0",
        "squareoff":       "0",
        "stoploss":        "0",
    }
    return session.placeOrder(order_params)


def cancel_order(order_id: str, variety: str = "NORMAL") -> dict:
    """Cancel an open order."""
    session, _ = get_session()
    return session.cancelOrder(order_id, variety)


# -------------------------------------------------------
# Market Data
# -------------------------------------------------------

def get_ltp(exchange: str, tradingsymbol: str, symboltoken: str) -> dict:
    """
    Get Last Traded Price for a symbol.
    Returns: {"exchange", "tradingsymbol", "symboltoken", "ltp"}
    """
    session, _ = get_session()
    return session.ltpData(exchange, tradingsymbol, symboltoken)


# -------------------------------------------------------
# Portfolio / Positions
# -------------------------------------------------------

def get_holdings() -> dict:
    """Fetch all holdings (long-term DELIVERY positions)."""
    session, _ = get_session()
    return session.holding()


def get_positions() -> dict:
    """Fetch all open intraday / F&O positions."""
    session, _ = get_session()
    return session.position()


def get_order_book() -> dict:
    """Fetch today's order book."""
    session, _ = get_session()
    return session.orderBook()


def get_trade_book() -> dict:
    """Fetch today's executed trade book."""
    session, _ = get_session()
    return session.tradeBook()


# -------------------------------------------------------
# Profile
# -------------------------------------------------------

def get_profile() -> dict:
    """Fetch the logged-in user's profile from AngelOne."""
    session, _ = get_session()
    return session.getProfile(session.refresh_token if hasattr(session, "refresh_token") else "")
