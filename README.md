# Algo Trading Platform

A modular algorithmic trading backend designed for quantitative research, strategy development, and historical backtesting.  
The system emphasizes clean architecture, extensibility, and separation of concerns.

---

## Overview

This platform enables researchers and developers to design, test, and evaluate trading strategies using historical market data.  
It provides components for signal generation, regime detection, and trade-level performance analysis, exposed through a FastAPI backend.

---

## Features

- Market regime detection
- Strategy-based signal generation
- Trade-level backtesting engine
- Capital, drawdown, and PnL tracking
- RESTful API using FastAPI
- Modular and extensible codebase

---

## System Architecture

The system is organized into the following logical layers:

1. **Data Layer**
   - Historical market data ingestion
   - Feature engineering and preprocessing

2. **Strategy Layer**
   - Market regime identification
   - Trading signal generation
   - Strategy configuration and parameters

3. **Execution and Evaluation Layer**
   - Trade simulation
   - Backtesting engine
   - Performance metrics computation

---

## Technology Stack

- Programming Language: Python 3.10+
- Backend Framework: FastAPI
- Data Processing: Pandas, NumPy
- Market Data Source: yfinance
- ASGI Server: Uvicorn

---

## Project Structure


---

## Installation and Setup

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd Mini_Project/backend


pip install -r requirements.txt


uvicorn app.main:app --reload



http://127.0.0.1:8000
