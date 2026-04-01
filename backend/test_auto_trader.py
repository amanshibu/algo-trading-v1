import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.ml.auto_trader import auto_trader_loop, ALERTS
from app.ml.paper_trader import get_portfolio

async def test():
    task = asyncio.create_task(auto_trader_loop())
    await asyncio.sleep(5)
    print("ALERTS:", ALERTS)
    from app.database.db import SessionLocal
    db = SessionLocal()
    try:
        print("PORTFOLIO:", get_portfolio("demo@algotrader.local", db))
    finally:
        db.close()
    task.cancel()

asyncio.run(test())
