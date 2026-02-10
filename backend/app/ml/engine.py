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

def fetch_market_data(period="6mo", interval="1h"):
    data = yf.download(
        STOCKS,
        period=period,
        interval=interval,
        progress=False
    )["Close"]

    data = data.dropna()
    returns = data.pct_change(fill_method=None).dropna()

    return data, returns


# =========================
# STRATEGIES
# =========================

def detect_market_regime(data: pd.DataFrame | None = None):
    """
    Always return BULLISH or BEARISH.
    """

    if data is None:
        market = yf.download(BENCHMARK, period="3mo", interval="1d", progress=False)
        close = market["Close"].dropna()
    else:
        close = data["Close"].dropna()

    if len(close) < 50:
        return "BEARISH"

    ma_50 = float(close.rolling(50).mean().values[-1])
    price = float(close.values[-1])

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
