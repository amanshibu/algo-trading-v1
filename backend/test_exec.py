import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.ml.paper_trader import execute_trade, get_portfolio

def main():
    print(execute_trade("demo@algotrader.local", "RELIANCE.NS", "BUY", 1))

main()
