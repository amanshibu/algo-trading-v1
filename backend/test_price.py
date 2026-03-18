import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.ml.paper_trader import get_live_price, _get_price_from_angelone, _get_price_from_yfinance

def main():
    print("LIVE:", get_live_price("RELIANCE.NS"))
    print("AngelOne:", _get_price_from_angelone("RELIANCE.NS"))
    print("yfinance:", _get_price_from_yfinance("RELIANCE.NS"))

if __name__ == "__main__":
    main()
