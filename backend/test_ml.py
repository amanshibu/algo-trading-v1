import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.ml.engine import generate_signal
from app.ml.spectral_engine import get_spectral_signal
from app.ml.paper_trader import execute_trade, get_portfolio

def main():
    try:
        print("Testing spectral...")
        spectral = get_spectral_signal()
        print("Spectral:", spectral["signals"])
        print("\nTesting engine...")
        stat_arb = generate_signal()
        print("Stat Arb:", stat_arb)
        print("\nSuccess")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
