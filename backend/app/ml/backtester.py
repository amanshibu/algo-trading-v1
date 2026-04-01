import os
import logging
import time
from tvDatafeed import TvDatafeed, Interval
import pandas as pd

# Initialize tvDatafeed (without login)
tv = TvDatafeed()

# --- Configure Backtest Logger ---
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
BACKTEST_LOG_FILE = os.path.join(LOG_DIR, "backtest.log")

bt_logger = logging.getLogger("backtest")
bt_logger.setLevel(logging.INFO)
bt_logger.handlers.clear()
fh = logging.FileHandler(BACKTEST_LOG_FILE, encoding="utf-8")
fh.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
fh.setFormatter(formatter)
bt_logger.addHandler(fh)

INITIAL_CAPITAL = 100000  # ₹1L

INTERVAL_MAP = {
    "1m": (Interval.in_1_minute, 375),
    "3m": (Interval.in_3_minute, 125),
    "5m": (Interval.in_5_minute, 75),
    "15m": (Interval.in_15_minute, 25),
    "30m": (Interval.in_30_minute, 12),
    "45m": (Interval.in_45_minute, 8),
    "1h": (Interval.in_1_hour, 6),
    "2h": (Interval.in_2_hour, 3),
    "3h": (Interval.in_3_hour, 2),
    "4h": (Interval.in_4_hour, 2),
    "1d": (Interval.in_daily, 1),
    "1wk": (Interval.in_weekly, 0.2),
    "1mo": (Interval.in_monthly, 0.05),
}

def run_backtest(symbol="NIFTYBEES.NS", period="6mo", interval="1d", ma_period=10):
    bt_logger.info("=========================================================")
    bt_logger.info(f"🚀 Initializing Backtest Engine for {symbol}")
    bt_logger.info(f"📅 Historical Period: Past {period} | Interval: {interval} | MA: {ma_period}")
    bt_logger.info("=========================================================")
    bt_logger.info("Fetching historical market data from NSE...")
    try:
        # Retry mechanism for tvDatafeed 
        data = None
        
        # Map interval string to tvDatafeed Interval and daily multiplier
        tv_interval, multiplier = INTERVAL_MAP.get(interval, (Interval.in_daily, 1))
        
        # Calculate appropriate trading days based on period
        days = 130 # default 6mo
        if period == "2y":
            days = 504
        elif period == "1y":
            days = 252
        elif period == "3mo":
            days = 65
        elif period == "1mo":
            days = 22
        elif period == "6mo":
            days = 130
        
        # Calculate final bars requested (tvDatafeed limits to 5000 for free tier)
        bars = int(days * multiplier)
        if bars > 5000:
            bt_logger.warning(f"Requested {bars} bars for {period} at {interval}, capping to TradingView free limit of 5000.")
            bars = 5000
        elif bars < ma_period + 1:
            bars = ma_period + 1  # Minimum required for MA strategy
            
        # Parse symbol to match TradingView format (e.g. NIFTYBEES.NS -> symbol=NIFTYBEES, exchange=NSE)
        tv_symbol = symbol
        exchange = "NSE"
        if tv_symbol.endswith(".NS"):
            tv_symbol = tv_symbol[:-3]
            exchange = "NSE"
        elif tv_symbol.endswith(".BO"):
            tv_symbol = tv_symbol[:-3]
            exchange = "BSE"
        
        for attempt in range(3):
            data = tv.get_hist(symbol=tv_symbol, exchange=exchange, interval=tv_interval, n_bars=bars)
            
            if data is not None and not data.empty:
                # rename columns to match existing logic
                # tvDatafeed returns: symbol, open, high, low, close, volume
                data.rename(columns={"open": "Open", "high": "High", "low": "Low", "close": "Close", "volume": "Volume"}, inplace=True)
                
                # Use standard datetime index depending on interval type
                if interval in ["1d", "1wk", "1mo"]:
                    data.index = pd.to_datetime(data.index).normalize() # Ensure index is simple dates
                else:
                    data.index = pd.to_datetime(data.index) # Keep intraday times
                
                if len(data) >= ma_period + 1:
                    break
            
            bt_logger.warning(f"Attempt {attempt+1}: Not enough data for {symbol} from TradingView. Required: {ma_period + 1}, Got: {len(data) if data is not None else 0}. Retrying...")
            time.sleep(2)

        if data is None or data.empty or len(data) < ma_period + 1:
            bt_logger.error(f"Failed to fetch sufficient data for {symbol} after 3 attempts. Required: {ma_period + 1}, Got: {len(data) if data is not None else 0}")
            return _empty_result()

    except Exception as e:
        bt_logger.error(f"[Backtest] TradingView download failed: {e}")
        print(f"[Backtest] TradingView download failed: {e}")
        return _empty_result()

    bt_logger.info(f"✅ Data loaded successfully. Analyzed {len(data)} trading days.")
    bt_logger.info(f"💰 Initial Virtual Capital: ₹{INITIAL_CAPITAL:,.2f}")
    bt_logger.info("⏳ Simulating daily trading decisions based on Market Regime strategy...")
    capital = float(INITIAL_CAPITAL)
    position = None
    entry_price = 0.0
    trades = []
    equity_curve = [capital]  # track equity over time for drawdown calc

    # Pre-calculate moving average
    data["SMA"] = data["Close"].rolling(window=ma_period).mean()
    data["MA"] = data["Close"].rolling(ma_period).mean()

    for i in range(ma_period, len(data)):
        price = float(data["Close"].values[i])
        ma = float(data["MA"].values[i])
        
        regime = "BULLISH" if price >= ma else "BEARISH"

        # BUY
        if regime == "BULLISH" and position is None:
            position = "LONG"
            entry_price = price
            trade_entry_date = data.index[i]
            
            date_fmt = '%Y-%m-%d' if interval in ["1d", "1wk", "1mo"] else '%Y-%m-%d %H:%M:%S'
            bt_logger.info(f"[{trade_entry_date.strftime(date_fmt)}] 📈 Market turned BULLISH. Executing BUY order at ₹{price:.2f}.")

        # SELL
        elif regime == "BEARISH" and position == "LONG":
            pnl = price - entry_price
            capital += pnl
            
            date_fmt = '%Y-%m-%d' if interval in ["1d", "1wk", "1mo"] else '%Y-%m-%d %H:%M:%S'
            entry_date_str = trade_entry_date.strftime(date_fmt)
            exit_date_str = data.index[i].strftime(date_fmt)
            
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
    win_rate = round((profit_trades / len(trades)) * 100, 1) if len(trades) > 0 else 0
    avg_pnl = round(sum(t["pnl"] for t in trades) / len(trades), 2) if len(trades) > 0 else 0
    winning_pnls = [t["pnl"] for t in trades if t["pnl"] > 0]
    losing_pnls = [t["pnl"] for t in trades if t["pnl"] <= 0]
    avg_win = round(sum(winning_pnls) / len(winning_pnls), 2) if winning_pnls else 0
    avg_loss = round(sum(losing_pnls) / len(losing_pnls), 2) if losing_pnls else 0
    return_pct = round(((capital - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100, 2)

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
        "net_pnl": net_pnl,
        "max_drawdown_pct": max_drawdown_pct,
        "win_rate": win_rate,
        "avg_pnl": avg_pnl,
        "avg_win": avg_win,
        "avg_loss": avg_loss,
        "return_pct": return_pct,
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

