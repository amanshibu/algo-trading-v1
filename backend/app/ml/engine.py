"""
ML Engine (Quant Brain)

Responsibilities:
- Fetch market data
- Detect market regime
- Generate trading signals
- Return structured data only
"""

import yfinance as yf
import numpy as np
import pandas as pd
import networkx as nx

from app.ml.math_engine import kalman_filter, get_ou_params
from app.ml.cache import ttl_cache

# =========================
# CONFIG
# =========================

STOCKS = [
    "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "KOTAKBANK.NS",
    "TCS.NS", "INFY.NS", "HCLTECH.NS", "WIPRO.NS",
]

BENCHMARK = "^NSEI"
ENTRY_Z = 1.2


# =========================
# DATA LAYER
# =========================

@ttl_cache(ttl_seconds=300)
def fetch_market_data(period="6mo", interval="1h"):
    raw = yf.download(
        STOCKS,
        period=period,
        interval=interval,
        progress=False,
        timeout=10,
    )
    # yfinance v0.2+ wraps multi-ticker downloads in a MultiIndex.
    # Flatten it so we can access columns by ticker name directly.
    if isinstance(raw.columns, pd.MultiIndex):
        raw = raw["Close"]           # selects the Close level, columns = tickers
        if isinstance(raw.columns, pd.MultiIndex):
            raw.columns = raw.columns.droplevel(0)
    else:
        raw = raw["Close"]

    # Forward-fill then backward-fill so one stock's missing bar
    # doesn't wipe the entire dataset. Drop only fully-NaN rows.
    data = raw.ffill().bfill().dropna(how="all")
    returns = data.pct_change().dropna(how="all")
    return data, returns


# =========================
# STRATEGIES
# =========================

@ttl_cache(ttl_seconds=300)
def _fetch_benchmark_close(period, interval) -> pd.Series:
    """
    Fetch NIFTY 50 and return a guaranteed 1-D Close price Series.
    Handles both old (flat columns) and new (MultiIndex) yfinance formats.
    Uses a fresh session to avoid stale Yahoo Finance cookies.
    """
    raw = yf.download(BENCHMARK, period=period, interval=interval,
                      progress=False, timeout=10)
    # New yfinance format: MultiIndex columns like ('Close', '^NSEI')
    # Selecting raw["Close"] returns a 1-col DataFrame; squeeze → 1D Series.
    close = raw["Close"].squeeze()
    if isinstance(close, pd.DataFrame):
        # Last resort: take the first column
        close = close.iloc[:, 0]
    return close.ffill().bfill().dropna()


def _extract_close_series(df) -> pd.Series:
    """
    Robustly pull a 1-D Close price Series from a DataFrame or Series,
    regardless of yfinance version / MultiIndex structure.
    """
    if isinstance(df, pd.Series):
        return df
    close = df["Close"]
    if isinstance(close, pd.DataFrame):
        close = close.iloc[:, 0]
    return close


def detect_market_regime(data: pd.DataFrame | None = None):
    """
    Always return BULLISH or BEARISH.
    """
    if data is None:
        close = _fetch_benchmark_close("3mo", "1d")
    else:
        close = _extract_close_series(data).ffill().bfill().dropna()

    if len(close) < 50:
        return "BEARISH"

    if isinstance(close, pd.DataFrame):
        close = close.iloc[:, 0]
    
    ma_50 = float(close.rolling(50).mean().iloc[-1])
    try:
        price = float(close.iloc[-1])
    except AttributeError:
        # Fallback if close somehow became a float
        price = float(close)

    return "BULLISH" if price >= ma_50 else "BEARISH"







def build_correlation_clusters(returns, threshold=0.6):
    corr = returns.corr()
    G = nx.Graph()

    for i in range(len(corr.columns)):
        for j in range(i + 1, len(corr.columns)):
            val = corr.iloc[i, j]
            if not np.isnan(val) and val > threshold:
                G.add_edge(corr.columns[i], corr.columns[j])

    return list(nx.connected_components(G))


def find_best_pair(data, cluster):
    best_signal = None
    best_z = 0.0

    cluster = list(cluster)

    for i in range(len(cluster)):
        for j in range(i + 1, len(cluster)):
            a, b = cluster[i], cluster[j]

            ratio = data[a].mean() / data[b].mean()
            spread = data[a] - ratio * data[b]
            spread = spread.dropna()

            if len(spread) < 50:
                continue

            filtered = kalman_filter(spread.values)

            theta, mu, sigma = get_ou_params(filtered)

            if sigma is None or sigma <= 1e-6:
                continue

            z = (filtered[-1] - mu) / sigma

            if abs(z) > abs(best_z):
                best_z = z
                best_signal = {
                    "pair": f"{a} vs {b}",
                    "z_score": round(float(z), 2),
                    "mean_reversion_speed": round(float(theta), 3)
                }

    return best_signal


# =========================
# MASTER ENGINE
# =========================

def generate_signal():
    """
    Main engine entry point.
    """

    data, returns = fetch_market_data()

    # Guard: if data is empty after cleaning, return a safe fallback.
    if data.empty or returns.empty:
        return {"regime": "BEARISH", "signal": None}

    regime = detect_market_regime()
    clusters = build_correlation_clusters(returns)

    for cluster in clusters:
        if len(cluster) < 2:
            continue

        signal = find_best_pair(data, cluster)

        if signal:
            z = signal["z_score"]

            if z < -ENTRY_Z:
                action = "BUY A / SELL B"
                reason = f"Spread extremely low (z={z})"
            elif z > ENTRY_Z:
                action = "SELL A / BUY B"
                reason = f"Spread extremely high (z={z})"
            else:
                continue

            confidence = min(abs(z) / 3, 0.85)

            return {
                "regime": regime,
                "signal": {
                    **signal,
                    "action": action,
                    "confidence": confidence,
                    "reason": reason,
                    "entry_threshold": ENTRY_Z
                }
            }

    return {
        "regime": regime,
        "signal": None
    }
