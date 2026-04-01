from app.ml.backtester import run_backtest
import sys
import logging

# Mute backtester logs so we only see the final table
logging.getLogger("backtest").setLevel(logging.ERROR)

timeframes = ["1mo", "1wk", "1d", "1h", "15m", "5m", "1m"]

print("=========================================================")
print(f"{'Timeframe':<10} | {'Total Trades':<15} | {'Win Rate':<10} | {'Net PnL':<10}")
print("=========================================================")

for tf in timeframes:
    try:
        # We request "1y" period for all, so the engine takes as much as tvDatafeed allows (up to 5000)
        res = run_backtest(symbol="NIFTYBEES.NS", period="1y", interval=tf)
        trades = res.get("total_trades", 0)
        wins = res.get("profit_trades", 0)
        pnl = res.get("net_pnl", 0)
        win_rate = f"{(wins/trades)*100:.1f}%" if trades > 0 else "0.0%"
        
        print(f"{tf:<10} | {trades:<15} | {win_rate:<10} | {pnl:<10.2f}")
    except Exception as e:
        print(f"{tf:<10} | Error: {str(e)}")

print("=========================================================")
