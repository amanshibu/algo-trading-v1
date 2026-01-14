"""
ML Engine (Quant Brain)

This module is responsible for:
- Fetching market data
- Detecting market regime
- Generating high-probability trading signals
- Returning structured data (NO prints, NO FastAPI here)
"""

import yfinance as yf
import numpy as np
import pandas as pd
import networkx as nx

from app.ml.math_engine import kalman_filter, get_ou_params


# =========================
# CONFIG
# =========================

STOCKS = [
    "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "KOTAKBANK.NS",
    "TCS.NS", "INFY.NS", "HCLTECH.NS", "WIPRO.NS",
]

BENCHMARK = "^NSEI"


# =========================
# DATA LAYER
# =========================

def fetch_market_data(period="6mo", interval="1h"):
    data = yf.download(
        STOCKS,
        period=period,
        interval=interval,
        progress=False
    )["Close"]

    returns = data.pct_change(fill_method=None).dropna()
    return data, returns


# =========================
# STRATEGIES
# =========================

def detect_market_regime(data: pd.DataFrame | None = None):
    """
    Detects market regime using BENCHMARK only.
    """

    if data is None:
        market = yf.download(BENCHMARK, period="3mo", interval="1d", progress=False)
        close = market["Close"]
    else:
        # Backtest mode: data is already benchmark history
        close = data["Close"]

    # 🔑 Convert to scalar values
    ma_50 = close.rolling(50).mean().iloc[-1]
    price = close.iloc[-1]

    ma_50 = float(ma_50)
    price = float(price)

    if price > ma_50 * 1.01:
        return "BULLISH"
    elif price < ma_50 * 0.99:
        return "BEARISH"
    else:
        return "NEUTRAL"



def build_correlation_clusters(returns, threshold=0.6):
    corr = returns.corr()
    G = nx.Graph()

    for i in range(len(corr.columns)):
        for j in range(i + 1, len(corr.columns)):
            if corr.iloc[i, j] > threshold:
                G.add_edge(corr.columns[i], corr.columns[j])

    return list(nx.connected_components(G))


def find_best_pair(data, cluster):
    best_signal = None
    best_z = 0

    cluster = list(cluster)

    for i in range(len(cluster)):
        for j in range(i + 1, len(cluster)):
            a, b = cluster[i], cluster[j]

            spread = data[a] - (data[a].mean() / data[b].mean()) * data[b]
            filtered = kalman_filter(spread.values)

            theta, mu, sigma = get_ou_params(filtered)
            if sigma == 0:
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
# MASTER ENGINE (THE BRAIN)
# =========================

def generate_signal():
    """
    Main entry point called by API.
    Returns ONE best signal or None.
    """

    data, returns = fetch_market_data()
    regime = detect_market_regime()
    clusters = build_correlation_clusters(returns)

    for cluster in clusters:
        if len(cluster) < 2:
            continue

        signal = find_best_pair(data, cluster)

        if signal:
            z = signal["z_score"]

            action = "WAIT"
            confidence = 0.0

            if z < -2 and regime == "BULLISH":
                action = "BUY A / SELL B"
                confidence = 0.60

            elif z > 2 and regime == "BEARISH":
                action = "SELL A / BUY B"
                confidence = 0.60

            if action != "WAIT":
                return {
                    "regime": regime,
                    "signal": {
                        **signal,
                        "action": action,
                        "confidence": confidence
                    }
                }

    return {
        "regime": regime,
        "signal": None
    }
