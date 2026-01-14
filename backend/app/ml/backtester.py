import pandas as pd
import yfinance as yf

from app.ml.engine import generate_signal, detect_market_regime

INITIAL_CAPITAL = 100000  # ₹1L virtual capital


def run_backtest(symbol="NIFTYBEES.NS", period="6mo"):
    data = yf.download(symbol, period=period, interval="1d", progress=False)

    capital = float(INITIAL_CAPITAL)
    position = None
    entry_price = 0.0
    trades = []

    for i in range(50, len(data)):
        # ✅ force scalar float
        price = float(data["Close"].iloc[i])

        # Slice data till "now"
        historical_data = data.iloc[:i]

        regime = detect_market_regime(historical_data)

        # BUY
        if regime == "BULLISH" and position is None:
            position = "LONG"
            entry_price = price

        # SELL
        elif regime == "BEARISH" and position == "LONG":
            pnl = price - entry_price  # already float
            capital += pnl

            trades.append({
                "entry_date": str(data.index[i - 1]),
    "exit_date": str(data.index[i]),
    "entry_price": round(entry_price, 2),
    "exit_price": round(price, 2),
    "pnl": round(pnl, 2)
})
            position = None           

    # ✅ SAFE trade analysis (no pandas ambiguity)
    profit_trades = sum(1 for t in trades if t["pnl"] > 0)
    loss_trades = sum(1 for t in trades if t["pnl"] <= 0)

    return {
    "initial_capital": INITIAL_CAPITAL,
    "final_capital": round(capital, 2),
    "total_trades": len(trades),
    "profit_trades": profit_trades,
    "loss_trades": loss_trades,
    "net_pnl": round(capital - INITIAL_CAPITAL, 2),
    "trades": trades
}

