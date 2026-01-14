import networkx as nx
import numpy as np
from app.ml.math_engine import MathEngine

def strategy_graph_clustering(returns, threshold=0.6):
    corr = returns.corr()
    G = nx.Graph()

    for i in range(len(corr.columns)):
        for j in range(i + 1, len(corr.columns)):
            if corr.iloc[i, j] > threshold:
                G.add_edge(corr.columns[i], corr.columns[j])

    return [list(cluster) for cluster in nx.connected_components(G)]

def strategy_stat_arb(data, cluster):
    best = None
    max_z = 0

    for i in range(len(cluster)):
        for j in range(i + 1, len(cluster)):
            a, b = cluster[i], cluster[j]

            hedge_ratio = data[a].mean() / data[b].mean()
            spread = data[a] - hedge_ratio * data[b]

            true_spread = MathEngine.kalman_filter(spread.values)
            theta, mu, sigma = MathEngine.get_ou_params(true_spread)

            if sigma == 0:
                continue

            z = (true_spread[-1] - mu) / sigma

            if abs(z) > abs(max_z):
                max_z = z
                best = {
                    "pair": (a, b),
                    "z_score": round(float(z), 2),
                    "theta": round(float(theta), 4)
                }

    return best

def strategy_regime_filter(market_prices):
    ma_50 = market_prices.rolling(50).mean().iloc[-1]
    price = market_prices.iloc[-1]

    return "BULLISH" if price > ma_50 else "BEARISH"
