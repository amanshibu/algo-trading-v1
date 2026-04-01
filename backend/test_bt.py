import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from app.ml.backtester import run_backtest

res = run_backtest("NIFTYBEES.NS", "6mo")
print(res)
