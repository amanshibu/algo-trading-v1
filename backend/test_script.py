import sys
import pandas as pd
import yfinance as yf
from app.database.db import SessionLocal
from app.database.models import Position, TradeHistory
from app.ml.paper_trader import _get_price_from_yfinance

def test_db():
    db = SessionLocal()
    pos = db.query(Position).all()
    hist = db.query(TradeHistory).order_by(TradeHistory.exit_time.desc()).limit(15).all()
    print("=== POSITIONS ===")
    for p in pos:
        print(f"{p.ticker} | Action: {p.action} | Entry: {p.entry_price} | Cost: {p.cost}")
        
    print("\n=== HISTORY ===")
    for h in hist:
        print(f"{h.ticker} | Action: {h.action} | Entry: {h.entry_price} | Exit: {h.exit_price} | PnL: {h.pnl}")

def test_yf():
    tickers = ['RELIANCE', 'TCS', 'INFY', 'SBIN', 'HCLTECH', 'WIPRO']
    print("\n=== YFINANCE PRICES ===")
    for t in tickers:
        try:
            p = _get_price_from_yfinance(t)
            print(f"{t}: {p}")
        except Exception as e:
            print(f"{t}: Error {e}")

if __name__ == "__main__":
    test_db()
    test_yf()
