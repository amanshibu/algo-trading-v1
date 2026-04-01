from app.ml.backtester import run_backtest
import json
import logging
logging.getLogger("backtest").setLevel(logging.ERROR)

timeframes = ["1mo", "1wk", "1d", "1h", "15m", "5m", "1m"]
out = {}

for tf in timeframes:
    try:
        res = run_backtest("NIFTYBEES.NS", "1y", tf)
        out[tf] = {
            "Total Trades": res.get("total_trades", 0),
            "Win Rate": f"{(res.get('profit_trades',0) / res.get('total_trades',1) * 100):.1f}%" if res.get('total_trades',0) > 0 else "0.0%"
        }
    except Exception as e:
        out[tf] = {"Error": str(e)}

with open("out.json", "w", encoding="utf-8") as f:
    json.dump(out, f, indent=4)
