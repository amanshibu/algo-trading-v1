import asyncio
from datetime import datetime
from app.ml.engine import generate_signal
from app.ml.spectral_engine import get_spectral_signal
from app.ml.paper_trader import execute_trade, get_portfolio
from app.routes.auth import USERS

# In-memory store for alerts
ALERTS = []

async def auto_trader_loop():
    """
    Background task that periodically checks signals and executes them.
    It logs the reasoning to ALERTS.
    """
    while True:
        try:
            now = datetime.now()
            # Identify which users to execute trades for (the true virtual wallets)
            target_emails = list(USERS.keys()) if USERS else ["demo@algotrader.local"]

            # --- 1. Spectral Signals (Graph Signal Processing) ---
            spectral = get_spectral_signal()
            signals = spectral.get("signals", [])
            
            # Execute for all users, but only log the alert once
            for i, email in enumerate(target_emails):
                pf = get_portfolio(email)
                open_tickers = [p["ticker"] for p in pf.get("positions", [])]
            
            for sig in signals:
                yf_ticker = sig["ticker"] if ".NS" in sig["ticker"] else f"{sig['ticker']}.NS"
                
                # BUY Lagging Stocks
                if sig["action"] == "BUY" and yf_ticker not in open_tickers:
                    res = execute_trade(email, sig["ticker"], "BUY", 1)
                    if "error" not in res and i == 0:
                        ALERTS.insert(0, {
                            "id": str(now.timestamp()) + "_buy",
                            "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
                            "strategy": "Spectral Alpha",
                            "ticker": sig["ticker"],
                            "action": "AUTO-BUY",
                            "reason": sig["reason"],
                            "details": f"Executed at ₹{res.get('trade', {}).get('entry_price', 0)}"
                        })
                        
                # SELL Leading Stocks (If holding, close it. Else, open SHORT)
                elif sig["action"] == "SELL":
                    if yf_ticker in open_tickers:
                        # Find the side (BUY vs SELL) of our open position so we know if we are closing a long or what
                        pos = next((p for p in pf.get("positions", []) if p["ticker"] == yf_ticker), None)
                        if pos and pos["action"] == "BUY":
                            # Close the existing position
                            res = execute_trade(email, sig["ticker"], "CLOSE", 1)
                            if "error" not in res and i == 0:
                                pnl = res.get("pnl", 0)
                                ALERTS.insert(0, {
                                    "id": str(now.timestamp()) + "_close",
                                    "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
                                    "strategy": "Spectral Alpha",
                                    "ticker": sig["ticker"],
                                    "action": "AUTO-CLOSE",
                                    "reason": "Mean reversion triggered",
                                    "details": f"Closed at ₹{res.get('exit_price', 0)} (P&L: ₹{pnl})"
                                })
                    else:
                        # Open new short position
                        res = execute_trade(email, sig["ticker"], "SELL", 1)
                        if "error" not in res and i == 0:
                            ALERTS.insert(0, {
                                "id": str(now.timestamp()) + "_short",
                                "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
                                "strategy": "Spectral Alpha",
                                "ticker": sig["ticker"],
                                "action": "AUTO-SELL",
                                "reason": sig["reason"],
                                "details": f"Short executed at ₹{res.get('trade', {}).get('entry_price', 0)}"
                            })

            # --- 2. Statistical Arbitrage (Pairs Trading) ---
            stat_arb = generate_signal()
            sig2 = stat_arb.get("signal")
            if sig2:
                action_text = sig2["action"]
                pair = sig2["pair"]
                reason = sig2["reason"]
                
                # Pair format is "TICKER_A vs TICKER_B" e.g., "HDFCBANK.NS vs ICICIBANK.NS"
                if " vs " in pair:
                    a, b = pair.split(" vs ")
                    yf_a = a if ".NS" in a else f"{a}.NS"
                    yf_b = b if ".NS" in b else f"{b}.NS"
                    
                    # Ensure we don't continuously open the exact same active pair trade
                    if yf_a not in open_tickers and yf_b not in open_tickers:
                        # Determine which to buy and which to sell
                        if "BUY A" in action_text: # "BUY A / SELL B"
                            res_a = execute_trade(email, a, "BUY", 1)
                            res_b = execute_trade(email, b, "SELL", 1)  # shorting
                        else:                      # "SELL A / BUY B"
                            res_a = execute_trade(email, a, "SELL", 1)  # shorting
                            res_b = execute_trade(email, b, "BUY", 1)
                            
                        # If either succeeded, we log it
                        if ("error" not in res_a or "error" not in res_b) and i == 0:
                            ALERTS.insert(0, {
                                "id": str(now.timestamp()) + "_pair",
                                "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
                                "strategy": "Statistical Arbitrage",
                                "ticker": pair,
                                "action": f"AUTO-EXECUTE: {action_text}",
                                "reason": reason,
                                "details": f"Confidence: {sig2.get('confidence', 0)*100:.1f}% | Legs Traded (Paper)"
                            })
                    else:
                        # We already have an open leg for this pair. Let's act on close logic.
                        z = sig2.get("z_score", 1.0)
                        if abs(z) < 0.2:
                            res_a = execute_trade(email, a, "CLOSE", 1)
                            res_b = execute_trade(email, b, "CLOSE", 1)
                            if i == 0:
                                pnl_a = res_a.get('pnl', 0) if "error" not in res_a else 0
                                pnl_b = res_b.get('pnl', 0) if "error" not in res_b else 0
                                ALERTS.insert(0, {
                                    "id": str(now.timestamp()) + "_pair_close",
                                    "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
                                    "strategy": "Statistical Arbitrage",
                                    "ticker": pair,
                                    "action": "AUTO-CLOSE PAIR",
                                    "reason": f"Spread reverted (z={z:.2f})",
                                    "details": f"Net P&L: ₹{pnl_a + pnl_b}"
                                })

            # Trim alerts to keep only the 50 most recent
            while len(ALERTS) > 50:
                ALERTS.pop()
                
        except Exception as e:
            print(f"[AutoTrader] Error: {e}")
            
        # Run every 60 seconds
        await asyncio.sleep(60)

def get_alerts():
    return ALERTS
