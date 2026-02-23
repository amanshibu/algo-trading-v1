import yfinance as yf
import pandas as pd
from app.ml.engine import detect_market_regime

INITIAL_CAPITAL = 100000  # ₹1L


def run_backtest(symbol="NIFTYBEES.NS", period="6mo"):
    try:
        data = yf.download(symbol, period=period, interval="1d", progress=False)
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.droplevel("Ticker")
        data = data.dropna()

        if len(data) < 51:
            # Not enough data to run backtest
            return _empty_result()

    except Exception as e:
        print(f"[Backtest] yfinance download failed: {e}")
        return _empty_result()

    capital = float(INITIAL_CAPITAL)
    position = None
    entry_price = 0.0
    trades = []
    equity_curve = [capital]  # track equity over time for drawdown calc

    for i in range(50, len(data)):
        price = float(data["Close"].values[i])
        historical_data = data.iloc[:i]

        regime = detect_market_regime(historical_data)

        # BUY
        if regime == "BULLISH" and position is None:
            position = "LONG"
            entry_price = price

        # SELL
        elif regime == "BEARISH" and position == "LONG":
            pnl = price - entry_price
            capital += pnl

            trades.append({
                "entry_date": str(data.index[i - 1]),
                "exit_date": str(data.index[i]),
                "entry_price": round(entry_price, 2),
                "exit_price": round(price, 2),
                "pnl": round(pnl, 2)
            })

            position = None

        # Record current equity (mark-to-market if in a position)
        if position == "LONG":
            mtm = capital + (price - entry_price)
        else:
            mtm = capital
        equity_curve.append(mtm)

    # Compute max drawdown from equity curve
    peak = equity_curve[0]
    max_drawdown = 0.0
    for equity in equity_curve:
        if equity > peak:
            peak = equity
        drawdown = (peak - equity) / peak  # as a fraction
        if drawdown > max_drawdown:
            max_drawdown = drawdown

    max_drawdown_pct = round(max_drawdown * 100, 2)

    profit_trades = sum(1 for t in trades if t["pnl"] > 0)
    loss_trades = sum(1 for t in trades if t["pnl"] <= 0)

    return {
        "initial_capital": INITIAL_CAPITAL,
        "final_capital": round(capital, 2),
        "total_trades": len(trades),
        "profit_trades": profit_trades,
        "loss_trades": loss_trades,
        "net_pnl": round(capital - INITIAL_CAPITAL, 2),
        "max_drawdown_pct": max_drawdown_pct,
        "trades": trades
    }


def _empty_result():
    """Safe fallback when backtest cannot run."""
    return {
        "initial_capital": INITIAL_CAPITAL,
        "final_capital": INITIAL_CAPITAL,
        "total_trades": 0,
        "profit_trades": 0,
        "loss_trades": 0,
        "net_pnl": 0,
        "max_drawdown_pct": 0,
        "trades": []
    }

