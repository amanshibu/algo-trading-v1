import yfinance as yf
from app.core.config import STOCKS, BENCHMARK

def load_stock_data(period="6mo", interval="1h"):
    data = yf.download(
        STOCKS,
        period=period,
        interval=interval,
        progress=False
    )["Close"]
    return data

def load_market_regime(period="3mo"):
    market = yf.download(
        BENCHMARK,
        period=period,
        progress=False
    )["Close"]
    return market
