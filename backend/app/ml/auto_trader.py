import asyncio
from datetime import datetime
from app.ml.engine import generate_signal
from app.ml.spectral_engine import get_spectral_signal
from app.ml.paper_trader import (
    execute_trade,
    get_portfolio,
    get_margin_status,
    close_all_positions,
    RISK_CONFIG,
)
from app.database.db import SessionLocal
from app.database.models import User

# In-memory store for recent alerts (ephemeral — intentionally not persisted)
ALERTS = []


def _get_all_user_emails() -> list[str]:
    """Fetch all registered user emails from the DB."""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        return [u.email for u in users] or ["demo@algotrader.local"]
    except Exception:
        return ["demo@algotrader.local"]
    finally:
        db.close()


def _run_auto_trader_cycle():
    now          = datetime.now()
    target_emails = _get_all_user_emails()
    logged_this_cycle = set()

    # --- Fetch signals ONCE (outside the per-user loop) ---
    spectral = get_spectral_signal()
    signals  = spectral.get("signals", [])
    stat_arb = generate_signal()
    sig2     = stat_arb.get("signal")

    # ── Per-user execution loop ────────────────────────────────────
    for i, email in enumerate(target_emails):
        # Each user gets their own DB session per cycle
        db = SessionLocal()
        try:
            # ── 0. Trailing Stop-Loss Guard ─────────────────────────
            if RISK_CONFIG.get("enabled", True):
                margin = get_margin_status(email, db)
                if margin["stop_loss_hit"]:
                    close_all_positions(email, db, reason="TRAILING_STOP_LOSS")
                    if "TRAILING_SL" not in logged_this_cycle:
                        logged_this_cycle.add("TRAILING_SL")
                        ALERTS.insert(0, {
                            "id":        f"{now.timestamp()}_trailing_sl",
                            "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
                            "strategy":  "Risk Manager",
                            "ticker":    "ALL POSITIONS",
                            "action":    "🔴 TRAILING STOP-LOSS",
                            "reason": (
                                f"Net worth ₹{margin['net_worth']:,.0f} fell below "
                                f"trailing SL floor ₹{margin['stop_loss_level']:,.0f} "
                                f"({margin['stop_loss_pct']}% below peak ₹{margin['peak_net_worth']:,.0f})"
                            ),
                            "details": (
                                f"All open positions liquidated. "
                                f"Peak: ₹{margin['peak_net_worth']:,.0f} | "
                                f"SL Floor: ₹{margin['stop_loss_level']:,.0f}"
                            ),
                        })
                    continue  # skip signal processing this cycle

            pf           = get_portfolio(email, db)
            open_tickers = [p["ticker"] for p in pf.get("positions", [])]

            # --- 1. Spectral Signals (Graph Signal Processing) -------
            for sig in signals:
                yf_ticker = sig["ticker"] if ".NS" in sig["ticker"] else f"{sig['ticker']}.NS"

                if sig["action"] == "BUY" and yf_ticker not in open_tickers:
                    res = execute_trade(email, sig["ticker"], "BUY", 1, db)
                    if "error" not in res:
                        open_tickers.append(yf_ticker)
                        buy_key = f"buy_{sig['ticker']}"
                        if buy_key not in logged_this_cycle:
                            logged_this_cycle.add(buy_key)
                            ALERTS.insert(0, {
                                "id":        str(now.timestamp()) + "_buy",
                                "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
                                "strategy":  "Spectral Alpha",
                                "ticker":    sig["ticker"],
                                "action":    "AUTO-BUY",
                                "reason":    sig["reason"],
                                "details":   f"Executed at ₹{res.get('trade', {}).get('entry_price', 0)}",
                            })

                elif sig["action"] == "SELL":
                    if yf_ticker in open_tickers:
                        pos = next(
                            (p for p in pf.get("positions", []) if p["ticker"] == yf_ticker),
                            None,
                        )
                        if pos and pos["action"] == "BUY":
                            res = execute_trade(email, sig["ticker"], "CLOSE", 1, db)
                            if "error" not in res:
                                open_tickers.remove(yf_ticker)
                                close_key = f"close_{sig['ticker']}"
                                if close_key not in logged_this_cycle:
                                    logged_this_cycle.add(close_key)
                                    pnl = res.get("pnl", 0)
                                    ALERTS.insert(0, {
                                        "id":        str(now.timestamp()) + "_close",
                                        "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
                                        "strategy":  "Spectral Alpha",
                                        "ticker":    sig["ticker"],
                                        "action":    "AUTO-CLOSE",
                                        "reason":    "Signal flipped BUY→SELL — taking profit at signal reversal",
                                        "details":   f"Closed at ₹{res.get('exit_price', 0)} (P&L: ₹{pnl:+,.2f})",
                                    })
                    else:
                        res = execute_trade(email, sig["ticker"], "SELL", 1, db)
                        if "error" not in res:
                            open_tickers.append(yf_ticker)
                            short_key = f"short_{sig['ticker']}"
                            if short_key not in logged_this_cycle:
                                logged_this_cycle.add(short_key)
                                ALERTS.insert(0, {
                                    "id":        str(now.timestamp()) + "_short",
                                    "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
                                    "strategy":  "Spectral Alpha",
                                    "ticker":    sig["ticker"],
                                    "action":    "AUTO-SELL",
                                    "reason":    sig["reason"],
                                    "details":   f"Short executed at ₹{res.get('trade', {}).get('entry_price', 0)}",
                                })

            # --- 2. Statistical Arbitrage (Pairs Trading) ------------
            if sig2 and " vs " in sig2.get("pair", ""):
                action_text = sig2["action"]
                pair        = sig2["pair"]
                reason      = sig2["reason"]
                a, b        = pair.split(" vs ")
                yf_a        = a if ".NS" in a else f"{a}.NS"
                yf_b        = b if ".NS" in b else f"{b}.NS"

                if yf_a not in open_tickers and yf_b not in open_tickers:
                    if "BUY A" in action_text:
                        res_a = execute_trade(email, a, "BUY",  1, db)
                        res_b = execute_trade(email, b, "SELL", 1, db)
                    else:
                        res_a = execute_trade(email, a, "SELL", 1, db)
                        res_b = execute_trade(email, b, "BUY",  1, db)

                    if ("error" not in res_a or "error" not in res_b):
                        pair_key = f"pair_{pair}"
                        if pair_key not in logged_this_cycle:
                            logged_this_cycle.add(pair_key)
                            ALERTS.insert(0, {
                                "id":        str(now.timestamp()) + "_pair",
                                "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
                                "strategy":  "Statistical Arbitrage",
                                "ticker":    pair,
                                "action":    f"AUTO-EXECUTE: {action_text}",
                                "reason":    reason,
                                "details":   f"Confidence: {sig2.get('confidence', 0)*100:.1f}% | Legs Traded (Paper)",
                            })
                else:
                    z = sig2.get("z_score", 1.0)
                    if abs(z) < 0.2:
                        res_a = execute_trade(email, a, "CLOSE", 1, db)
                        res_b = execute_trade(email, b, "CLOSE", 1, db)
                        pair_close_key = f"pair_close_{pair}"
                        if pair_close_key not in logged_this_cycle:
                            logged_this_cycle.add(pair_close_key)
                            pnl_a = res_a.get("pnl", 0) if "error" not in res_a else 0
                            pnl_b = res_b.get("pnl", 0) if "error" not in res_b else 0
                            ALERTS.insert(0, {
                                "id":        str(now.timestamp()) + "_pair_close",
                                "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
                                "strategy":  "Statistical Arbitrage",
                                "ticker":    pair,
                                "action":    "AUTO-CLOSE PAIR",
                                "reason":    f"Spread reverted (z={z:.2f})",
                                "details":   f"Net P&L: ₹{pnl_a + pnl_b:+,.2f}",
                            })

        finally:
            db.close()

    # Trim alerts list to last 50
    while len(ALERTS) > 50:
        ALERTS.pop()


async def auto_trader_loop():
    """
    Background task that periodically checks signals and executes paper trades.

    Each cycle:
      1. Trailing SL guard runs FIRST — if margin dropped 5% below rolling peak,
         ALL positions are closed immediately.
      2. Spectral Alpha signals are processed.
      3. Statistical Arbitrage pairs are processed.

    Alerts are only logged for the first user (i == 0) to avoid duplicates.
    """
    while True:
        try:
            await asyncio.to_thread(_run_auto_trader_cycle)
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"[AutoTrader] Error: {e}")

        # Run every 60 seconds
        await asyncio.sleep(60)


def get_alerts():
    return ALERTS
