import os
import logging
import yfinance as yf
import pandas as pd
from app.ml.engine import detect_market_regime

# --- Configure Backtest Logger ---
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
BACKTEST_LOG_FILE = os.path.join(LOG_DIR, "backtest.log")

bt_logger = logging.getLogger("backtest")
bt_logger.setLevel(logging.INFO)
if not bt_logger.hasHandlers():
    fh = logging.FileHandler(BACKTEST_LOG_FILE)
    fh.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    fh.setFormatter(formatter)
    bt_logger.addHandler(fh)

INITIAL_CAPITAL = 100000  # ₹1L

def run_backtest(symbol="NIFTYBEES.NS", period="6mo"):
    bt_logger.info("=========================================================")
    bt_logger.info(f"🚀 Initializing Backtest Engine for {symbol}")
    bt_logger.info(f"📅 Historical Period: Past {period}")
    bt_logger.info("=========================================================")
    bt_logger.info("Fetching historical market data from NSE...")
    try:
        data = yf.download(symbol, period=period, interval="1d", progress=False, timeout=10)
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.droplevel("Ticker")
        data = data.dropna()

        if len(data) < 51:
            # Not enough data to run backtest
            bt_logger.warning(f"Not enough data to run backtest for {symbol}. Required: 51, Got: {len(data)}")
            return _empty_result()

    except Exception as e:
        bt_logger.error(f"[Backtest] yfinance download failed: {e}")
        print(f"[Backtest] yfinance download failed: {e}")
        return _empty_result()

    bt_logger.info(f"✅ Data loaded successfully. Analyzed {len(data)} trading days.")
    bt_logger.info(f"💰 Initial Virtual Capital: ₹{INITIAL_CAPITAL:,.2f}")
    bt_logger.info("⏳ Simulating daily trading decisions based on Market Regime strategy...")
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
            trade_entry_date = data.index[i].date()
            bt_logger.info(f"[{trade_entry_date.strftime('%Y-%m-%d')}] 📈 Market turned BULLISH. Executing BUY order at ₹{price:.2f}.")

        # SELL
        elif regime == "BEARISH" and position == "LONG":
            pnl = price - entry_price
            capital += pnl
            
            entry_date_str = str(trade_entry_date)
            exit_date_str = str(data.index[i].date())
            
            if pnl > 0:
                bt_logger.info(f"[{exit_date_str}] 📉 Market turned BEARISH. Executing SELL order at ₹{price:.2f}. Result: 🎉 PROFIT of ₹{pnl:.2f}. New Balance: ₹{capital:,.2f}")
            else:
                bt_logger.info(f"[{exit_date_str}] 📉 Market turned BEARISH. Executing SELL order at ₹{price:.2f}. Result: 🔻 LOSS of ₹{abs(pnl):.2f}. New Balance: ₹{capital:,.2f}")

            trades.append({
                "entry_date": entry_date_str,
                "exit_date": exit_date_str,
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
    net_pnl = round(capital - INITIAL_CAPITAL, 2)

    bt_logger.info("=========================================================")
    bt_logger.info("🏁 BACKTEST COMPLETE - STRATEGY PERFORMANCE SUMMARY")
    bt_logger.info("=========================================================")
    bt_logger.info(f"📊 Total Trades Executed: {len(trades)}")
    bt_logger.info(f"🏆 Winning Trades: {profit_trades} | ❌ Losing Trades: {loss_trades}")
    bt_logger.info(f"📉 Max Drawdown (Largest Portfolio Drop): {max_drawdown_pct}%")
    bt_logger.info(f"💵 Final Capital: ₹{capital:,.2f}")
    
    if net_pnl > 0:
        bt_logger.info(f"✨ Overall Result: The strategy was PROFITABLE, generating a net profit of ₹{net_pnl:,.2f}!")
    else:
        bt_logger.info(f"⚠️ Overall Result: The strategy was UNPROFITABLE, generating a net loss of ₹{abs(net_pnl):,.2f}.")
    bt_logger.info("=========================================================\n")

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

