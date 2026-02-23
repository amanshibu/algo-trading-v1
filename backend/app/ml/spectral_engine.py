"""
Spectral Engine — Graph Signal Processing (GSP)

Implements Laplacian smoothing on stock returns to detect
laggers (BUY) and leaders (SELL) across a correlated group.

Math:
  W     = correlation matrix (weight matrix)
  D     = degree matrix (diagonal of row-sums of W)
  L     = D - W  (Graph Laplacian)
  h     = (I - αL) · x   (smoothed signal)
  e     = x - h           (residual: deviation from neighbours)

  e > threshold → leader  → SELL signal
  e < -threshold → lagger → BUY  signal
"""

import numpy as np
import yfinance as yf

STOCKS = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS",
    "ICICIBANK.NS", "INFY.NS", "SBIN.NS",
]

ALPHA = 0.5           # smoothing strength
CORR_THRESHOLD = 0.4  # kill edges below this
SIGNAL_THRESHOLD = 0.0002  # residual threshold for trade signals


def _fetch_returns(period="5d", interval="15m"):
    data = yf.download(STOCKS, period=period, interval=interval, progress=False)["Close"]
    data = data.dropna()
    returns = data.pct_change(fill_method=None).dropna()
    return returns


def get_correlation_matrix():
    """
    Returns the full correlation heatmap data.
    """
    returns = _fetch_returns()
    W = returns.corr().values

    clean_names = [s.replace(".NS", "") for s in STOCKS]

    return {
        "stocks": clean_names,
        "matrix": np.round(W, 4).tolist(),
    }


def get_spectral_signal():
    """
    Runs Laplacian smoothing and returns raw, smoothed, and residual signals
    plus trade recommendations.
    """
    returns = _fetch_returns()
    W = returns.corr().values

    # Latest return vector
    x_raw = returns.iloc[-1].values

    # Threshold the weight matrix
    W_adj = W.copy()
    W_adj[W_adj < CORR_THRESHOLD] = 0

    # Graph Laplacian: L = D - W
    D = np.diag(W_adj.sum(axis=1))
    L = D - W_adj

    # Smoothed signal: h = (I - αL) · x
    I = np.identity(len(STOCKS))
    h_smoothed = (I - ALPHA * L).dot(x_raw)

    # Residuals
    residuals = x_raw - h_smoothed

    clean_names = [s.replace(".NS", "") for s in STOCKS]

    # Generate trade signals from residuals
    signals = []
    for i, stock in enumerate(clean_names):
        e = float(residuals[i])
        if e < -SIGNAL_THRESHOLD:
            action = "BUY"
            reason = f"Lagger (e={e:.5f}) — underperforming neighbours"
        elif e > SIGNAL_THRESHOLD:
            action = "SELL"
            reason = f"Leader (e={e:.5f}) — outperforming neighbours"
        else:
            action = "HOLD"
            reason = f"Stable (e={e:.5f})"
        signals.append({
            "ticker": stock,
            "action": action,
            "reason": reason,
            "residual": round(e, 6),
        })

    return {
        "stocks": clean_names,
        "raw": np.round(x_raw, 6).tolist(),
        "smoothed": np.round(h_smoothed, 6).tolist(),
        "residuals": np.round(residuals, 6).tolist(),
        "signals": signals,
        "params": {
            "alpha": ALPHA,
            "corr_threshold": CORR_THRESHOLD,
            "signal_threshold": SIGNAL_THRESHOLD,
        },
    }
