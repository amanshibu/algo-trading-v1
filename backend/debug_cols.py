import sys
sys.path.insert(0, ".")
import yfinance as yf
import pandas as pd

m = yf.download("^NSEI", period="3mo", interval="1d", progress=False)
print("raw type:", type(m.columns).__name__)
print("raw shape:", m.shape)
print("raw columns:", list(m.columns))

if isinstance(m.columns, pd.MultiIndex):
    print("IS MultiIndex, levels:", m.columns.nlevels)
    print("level 0:", m.columns.get_level_values(0).unique().tolist())
    print("level 1:", m.columns.get_level_values(1).unique().tolist())
    # In new yfinance: level 0 = price type (Close, High, etc.), level 1 = ticker
    # We want Close for the single ticker
    m2 = m["Close"]  # This might be a Series if single ticker or DataFrame
    print("m['Close'] type:", type(m2).__name__, "shape:", m2.shape)
    if isinstance(m2, pd.DataFrame):
        print("m['Close'] columns:", list(m2.columns))
        # squeeze to series
        c = m2.squeeze()
    else:
        c = m2
    print("final close type:", type(c).__name__, "shape:", c.shape)
    print("float(close.iloc[-1]):", float(c.iloc[-1]))
