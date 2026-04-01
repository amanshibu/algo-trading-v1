from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
import yfinance as yf
import pandas as pd
from datetime import datetime
from app.ml.backtester import run_backtest
from app.ml.engine import generate_signal, STOCKS, BENCHMARK  # 👈 CONNECT ML BRAIN
from app.ml.spectral_engine import get_correlation_matrix, get_spectral_signal  # 👈 SPECTRAL GSP
from app.ml.paper_trader import (
    get_portfolio, execute_trade as pt_execute,
    add_virtual_funds, reset_portfolio,
)  # 👈 PAPER TRADING
from app.routes.auth import get_optional_user
from app.database.db import get_db
from app.ml.cache import ttl_cache

router = APIRouter(
    prefix="/strategy",
    tags=["strategy"]
)


@router.get("/signal")
def get_strategy_signal():
    """
    Returns the current best trading signal (if any).
    """
    result = generate_signal()
    return result


@router.get("/backtest")
def backtest(symbol: str = "NIFTYBEES.NS", period: str = "6mo", interval: str = "1d", ma_period: int = 10):
    return run_backtest(symbol=symbol, period=period, interval=interval, ma_period=ma_period)


@router.get("/list")
def list_strategies():
    """
    Returns the actual strategies used by the platform with live data.
    """
    # Fetch live data from engines
    try:
        signal_data = generate_signal()
    except Exception:
        signal_data = {"regime": "N/A", "signal": None}

    try:
        backtest_data = run_backtest()
        bt_return_pct = round(
            ((backtest_data["final_capital"] - backtest_data["initial_capital"])
             / backtest_data["initial_capital"]) * 100, 2
        )
        bt_total_trades = backtest_data["total_trades"]
        bt_win_rate = (
            round((backtest_data["profit_trades"] / bt_total_trades) * 100, 1)
            if bt_total_trades > 0 else 0
        )
    except Exception:
        bt_return_pct = 0
        bt_total_trades = 0
        bt_win_rate = 0

    # Build current pair info
    pair_info = ""
    if signal_data.get("signal"):
        sig = signal_data["signal"]
        pair_info = f" Current pair: {sig['pair'].replace('.NS', '')} (z={sig['z_score']})"

    regime = signal_data.get("regime", "N/A")

    strategies = [
        {
            "name": "Statistical Arbitrage",
            "risk": "Medium",
            "description": f"Pairs trading using Kalman Filter and Ornstein-Uhlenbeck mean reversion on correlated NSE stocks.{pair_info}",
            "returnPct": f"{bt_return_pct:+.1f}" if bt_return_pct != 0 else "+0.0",
            "status": "Active" if signal_data.get("signal") else "Scanning",
            "details": {
                "technique": "Kalman Filter + OU Process",
                "universe": "NSE Banking & IT stocks",
                "signal": signal_data.get("signal"),
            }
        },
        {
            "name": "Market Regime Detection",
            "risk": "Low",
            "description": f"50-day moving average crossover on NIFTY 50 to classify market as BULLISH or BEARISH. Current regime: {regime}.",
            "returnPct": f"{bt_return_pct:+.1f}" if bt_return_pct != 0 else "+0.0",
            "status": regime,
            "details": {
                "technique": "50-Day MA Crossover",
                "benchmark": "NIFTY 50 (^NSEI)",
                "current_regime": regime,
            }
        },
        {
            "name": "Correlation Clustering",
            "risk": "Low",
            "description": "Graph-based clustering using NetworkX to identify groups of highly correlated stocks (threshold > 0.6) for pair selection.",
            "returnPct": "+0.0",
            "status": "Active",
            "details": {
                "technique": "NetworkX Graph Clustering",
                "threshold": 0.6,
                "universe": "8 NSE stocks (Banking + IT)",
            }
        },
        {
            "name": "Regime-Based Backtester",
            "risk": "Medium",
            "description": f"Trades NIFTYBEES ETF based on regime signals. {bt_total_trades} trades over 6 months with {bt_win_rate}% win rate.",
            "returnPct": f"{bt_return_pct:+.1f}" if bt_return_pct != 0 else "+0.0",
            "status": "Backtested",
            "details": {
                "technique": "Regime-Based Long/Short",
                "instrument": "NIFTYBEES.NS",
                "total_trades": bt_total_trades,
                "win_rate": bt_win_rate,
                "net_pnl": bt_return_pct,
            }
        },
        {
            "name": "Spectral Alpha (GSP)",
            "risk": "Medium",
            "description": "Graph Signal Processing with Laplacian smoothing to detect laggers and leaders across correlated stocks simultaneously.",
            "returnPct": "+0.0",
            "status": "Active",
            "details": {
                "technique": "Laplacian Smoothing (I - αL)x",
                "universe": "6 NSE stocks (RELIANCE, TCS, HDFC, ICICI, INFY, SBIN)",
                "alpha": 0.5,
                "corr_threshold": 0.4,
            }
        },
    ]

    return strategies


import os
@router.get("/backtest-logs")
def get_backtest_logs(lines: int = 150):
    """
    Returns the latest N lines from the backtest.log file for the frontend terminal.
    """
    log_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs", "backtest.log")
    try:
        if not os.path.exists(log_path):
            return {"logs": ["No backtest logs found yet. Run a strategy to generate logs."]}
            
        with open(log_path, "r", encoding="utf-8") as f:
            # Read all lines and return the last 'lines' count
            all_lines = f.readlines()
            return {"logs": [line.strip() for line in all_lines[-lines:]]}
    except Exception as e:
        return {"logs": [f"Error reading logs: {str(e)}"]}

@router.get("/correlation-heatmap")
def correlation_heatmap():
    """
    Returns the correlation matrix (Weight Matrix W) for the stock universe.
    Used by the frontend to render a heatmap visualisation.
    """
    try:
        return get_correlation_matrix()
    except Exception as e:
        return {"stocks": [], "matrix": [], "error": str(e)}


@router.get("/spectral-signal")
def spectral_signal():
    """
    Runs Laplacian smoothing and returns raw vs smoothed signals,
    residuals, and trade recommendations.
    """
    try:
        result = get_spectral_signal()
        result["generated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return result
    except Exception as e:
        return {"stocks": [], "raw": [], "smoothed": [], "residuals": [], "signals": [], "error": str(e)}


# =========================
# Paper Trading
# =========================

class TradeRequest(BaseModel):
    ticker: str
    action: str  # BUY, SELL, or CLOSE
    qty: int = 1


class FundsRequest(BaseModel):
    amount: float


@router.post("/execute-trade")
def execute_paper_trade(data: TradeRequest, user=Depends(get_optional_user),
                        db: Session = Depends(get_db)):
    """
    Execute a paper trade with virtual money.
    Actions: BUY, SELL, CLOSE
    """
    email = user["email"] if isinstance(user, dict) else user.email
    return pt_execute(email, data.ticker, data.action, data.qty, db)


@router.get("/paper-portfolio")
def paper_portfolio(user=Depends(get_optional_user), db: Session = Depends(get_db)):
    """
    Returns the current paper trading portfolio state.
    """
    email = user["email"] if isinstance(user, dict) else user.email
    return get_portfolio(email, db)


@router.post("/paper-add-funds")
def paper_add_funds(data: FundsRequest, user=Depends(get_optional_user),
                    db: Session = Depends(get_db)):
    """Add virtual funds to the paper trading balance."""
    email = user["email"] if isinstance(user, dict) else user.email
    return add_virtual_funds(email, data.amount, db)


@router.post("/paper-reset")
def paper_reset(user=Depends(get_optional_user), db: Session = Depends(get_db)):
    """Reset paper portfolio to initial state."""
    email = user["email"] if isinstance(user, dict) else user.email
    from app.ml.auto_trader import ALERTS
    ALERTS.clear()
    return reset_portfolio(email, db)


@router.get("/market-status")
def market_status():
    """
    Returns current NSE market status.
    is_open: true between 9:15 AM – 3:30 PM IST, Mon-Fri.
    """
    from app.ml.paper_trader import _market_status
    return _market_status()


@ttl_cache(ttl_seconds=60)
def _fetch_ticker_data(tickers):
    data = yf.download(tickers, period="2d", interval="1d", progress=False, timeout=10)["Close"]
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.droplevel(0)
    return data

@router.get("/ticker")
def get_ticker_prices():
    """
    Returns real-time stock prices for the ticker animation.
    """
    BANK_NIFTY = "^NSEBANK"
    tickers = STOCKS + [BENCHMARK, BANK_NIFTY]
    try:
        data = _fetch_ticker_data(tickers)

        results = []
        for ticker in tickers:
            try:
                col = data[ticker].dropna()
                if len(col) < 1:
                    continue
                    
                try:
                    current_price = float(col.iloc[-1])

                    # Calculate daily change
                    if len(col) >= 2:
                        prev_price = float(col.iloc[-2])
                        change = round(((current_price - prev_price) / prev_price) * 100, 2)
                    else:
                        change = 0.0
                except AttributeError:
                    current_price = float(col)
                    change = 0.0

                # Clean up display name
                display_name = ticker.replace(".NS", "").replace(".BO", "")
                if ticker == BENCHMARK:
                    display_name = "NIFTY 50"
                elif ticker == BANK_NIFTY:
                    display_name = "BANK NIFTY"

                results.append({
                    "symbol": display_name,
                    "price": f"{current_price:,.2f}",
                    "change": change,
                })
            except Exception:
                continue

        return results
    except Exception as e:
        return []

@router.get("/auto-alerts")
def get_auto_alerts():
    """
    Returns the recent algorithmic auto-execution alerts and reasoning.
    """
    from app.ml.auto_trader import get_alerts
    return get_alerts()

# =========================
# AngelOne Live Trading
# =========================

class LiveTradeRequest(BaseModel):
    tradingsymbol: str   # e.g. "RELIANCE-EQ"
    symboltoken: str     # e.g. "2885" — from AngelOne instrument list
    exchange: str        # "NSE" | "BSE" | "NFO"
    action: str          # "BUY" | "SELL"
    qty: int = 1
    order_type: str = "MARKET"   # "MARKET" | "LIMIT"
    product: str = "INTRADAY"    # "INTRADAY" | "DELIVERY"
    price: float = 0             # required for LIMIT orders


@router.post("/live-trade")
def execute_live_trade(data: LiveTradeRequest, user: dict = Depends(get_optional_user)):
    """
    Execute a REAL trade via AngelOne SmartAPI.

    Requires ANGELONE_CLIENT_ID, ANGELONE_PIN, and ANGELONE_TOTP_SECRET
    to be set in backend/.env (ANGELONE_API_KEY is already set).

    To find symboltoken for a stock, visit:
    https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json
    """
    try:
        from app.trading.angelone_broker import place_order
        result = place_order(
            tradingsymbol=data.tradingsymbol,
            symboltoken=data.symboltoken,
            exchange=data.exchange,
            action=data.action,
            qty=data.qty,
            order_type=data.order_type,
            product=data.product,
            price=data.price,
        )
        return {
            "status": "submitted",
            "mode": "LIVE",
            "order": result,
            "executed_by": user.get("email") if isinstance(user, dict) else user.email,
        }
    except RuntimeError as e:
        # Missing credentials — helpful message
        return {
            "status": "error",
            "mode": "LIVE",
            "error": str(e),
            "hint": "Fill in ANGELONE_CLIENT_ID, ANGELONE_PIN, ANGELONE_TOTP_SECRET in backend/.env"
        }
    except Exception as e:
        return {"status": "error", "mode": "LIVE", "error": str(e)}


@router.get("/live-holdings")
def live_holdings():
    """Fetch real holdings from AngelOne (requires full credentials in .env)."""
    try:
        from app.trading.angelone_broker import get_holdings
        return {"status": "ok", "mode": "LIVE", "holdings": get_holdings()}
    except RuntimeError as e:
        return {"status": "error", "error": str(e), "hint": "Complete .env setup first"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.get("/live-positions")
def live_positions():
    """Fetch real intraday positions from AngelOne (requires full credentials in .env)."""
    try:
        from app.trading.angelone_broker import get_positions
        return {"status": "ok", "mode": "LIVE", "positions": get_positions()}
    except RuntimeError as e:
        return {"status": "error", "error": str(e), "hint": "Complete .env setup first"}
    except Exception as e:
        return {"status": "error", "error": str(e)}