import React, { useState, useCallback, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { StrategyCard } from "@/components/StrategyCard";
import {
  X, Activity, TrendingUp, BarChart3, GitBranch, Zap,
  LineChart, Brain, DollarSign, Layers, Clock, Wifi,
  WifiOff, ChevronRight, Target, BookOpen, AlertTriangle, Terminal
} from "lucide-react";
import { Link } from "react-router-dom";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
interface Strategy {
  name: string;
  risk: "Low" | "Medium" | "High";
  returnPct: string;
  description: string;
  status: string;
  detail: string;
  howItWorks: string[];
  bestFor: string;
}

interface LiveSignal {
  regime: string;
  signal: {
    pair: string;
    action: string;
    z_score: number;
    confidence: number;
    reason: string;
    entry_threshold: number;
    mean_reversion_speed: number;
  } | null;
}

// ─────────────────────────────────────────
// Static Data
// ─────────────────────────────────────────
const strategyIcons: Record<string, React.ReactNode> = {
  "Mean Reversion": <Activity className="h-5 w-5" />,
  "Pairs Trading": <GitBranch className="h-5 w-5" />,
  "Momentum": <TrendingUp className="h-5 w-5" />,
  "Market Making": <DollarSign className="h-5 w-5" />,
  "Regime Detection": <BarChart3 className="h-5 w-5" />,
  "Statistical Arbitrage": <Zap className="h-5 w-5" />,
  "VWAP Execution": <LineChart className="h-5 w-5" />,
  "Trend Following": <TrendingUp className="h-5 w-5" />,
  "Sentiment Analysis": <Brain className="h-5 w-5" />,
  "Factor Investing": <Layers className="h-5 w-5" />,
};

const strategies: Strategy[] = [
  {
    name: "Mean Reversion",
    risk: "Medium",
    returnPct: "+18.4",
    description: "Exploits price deviations from historical averages. Trades the expected snap-back using z-score thresholds.",
    status: "Popular",
    detail: "Mean reversion assumes that asset prices tend to return to their long-term average over time. When a stock's price deviates significantly above or below its historical mean, the strategy bets on a correction. Traders use statistical measures like z-scores, Bollinger Bands, and standard deviation channels to identify overbought or oversold conditions.",
    howItWorks: [
      "Calculate the historical mean and standard deviation of the asset price",
      "Compute the z-score: how many standard deviations the current price is from the mean",
      "Enter a trade when z-score exceeds a threshold (e.g., z > 2 → sell, z < -2 → buy)",
      "Exit when the price reverts back toward the mean (z approaches 0)",
    ],
    bestFor: "Sideways or range-bound markets with moderate volatility",
  },
  {
    name: "Pairs Trading",
    risk: "Medium",
    returnPct: "+15.2",
    description: "Identifies two correlated stocks and trades the spread between them. Uses cointegration tests and Kalman Filters.",
    status: "Used in Engine",
    detail: "Pairs trading is a market-neutral strategy that matches a long position in one stock with a short position in a correlated stock. The idea is that correlated stocks move together, and when the spread between them widens, it will eventually converge. This engine uses the Kalman Filter for adaptive spread tracking and the Ornstein-Uhlenbeck process to model mean-reverting behavior.",
    howItWorks: [
      "Find pairs of stocks with high historical correlation (e.g., INFY & WIPRO)",
      "Calculate the price spread and apply a Kalman Filter to smooth it",
      "Estimate mean-reversion parameters using the Ornstein-Uhlenbeck model",
      "Trade when the spread's z-score exceeds entry thresholds",
    ],
    bestFor: "All market conditions — designed to be market-neutral",
  },
  {
    name: "Momentum",
    risk: "High",
    returnPct: "+32.6",
    description: "Buys assets showing upward price trends and sells those declining. Uses MA crossovers and RSI to time entries.",
    status: "Popular",
    detail: "Momentum trading capitalizes on the continuation of existing price trends. Stocks that have been going up tend to continue going up, and vice versa. Traders use indicators like Moving Average Crossovers (50-day crossing above 200-day), RSI, and rate of change to identify and ride trends.",
    howItWorks: [
      "Screen for stocks with strong recent price performance (3–12 month returns)",
      "Confirm trend strength using technical indicators (RSI > 50, MA crossover)",
      "Enter long positions in top performers, short positions in laggards",
      "Exit using trailing stops or when momentum indicators reverse",
    ],
    bestFor: "Strong trending markets — performs poorly in choppy conditions",
  },
  {
    name: "Market Making",
    risk: "High",
    returnPct: "+22.1",
    description: "Places simultaneous buy and sell orders to profit from the bid-ask spread. Requires minimal latency and tight risk controls.",
    status: "Advanced",
    detail: "Market making involves continuously quoting both buy and sell prices for a security, profiting from the bid-ask spread. Market makers provide liquidity to the market and earn a small profit on each transaction. This strategy requires extremely fast execution (microseconds), sophisticated inventory management, and robust risk systems.",
    howItWorks: [
      "Place limit orders on both sides of the order book (bid and ask)",
      "Profit from the spread when both orders get filled",
      "Dynamically adjust quotes based on inventory, volatility, and order flow",
      "Manage risk by hedging large inventory positions and setting position limits",
    ],
    bestFor: "Liquid markets with tight spreads — requires co-located servers",
  },
  {
    name: "Regime Detection",
    risk: "Low",
    returnPct: "+11.8",
    description: "Classifies market conditions as bullish or bearish using moving averages to adjust strategy exposure dynamically.",
    status: "Used in Engine",
    detail: "Regime detection identifies the current state of the market — trending, mean-reverting, or high volatility. This engine uses a 50-day moving average on NIFTY 50 to classify: BULLISH (price above MA) or BEARISH (price below MA).",
    howItWorks: [
      "Download historical NIFTY 50 benchmark data",
      "Calculate the 50-day simple moving average (SMA)",
      "If current price ≥ 50-day SMA → BULLISH regime",
      "If current price < 50-day SMA → BEARISH regime, reduce exposure",
    ],
    bestFor: "Portfolio management — used as a filter for other strategies",
  },
  {
    name: "Statistical Arbitrage",
    risk: "Medium",
    returnPct: "+20.5",
    description: "Uses mathematical models to find pricing inefficiencies across related securities using clustering and cointegration.",
    status: "Used in Engine",
    detail: "Statistical arbitrage (StatArb) uses mathematical models to identify and exploit pricing inefficiencies among groups of related securities. This engine uses NetworkX graph clustering to group correlated NSE stocks, then applies Kalman Filter and OU process to find the best trading opportunities.",
    howItWorks: [
      "Download 6 months of hourly price data for 8 NSE stocks",
      "Build a correlation graph and find clusters using NetworkX",
      "Within each cluster, test all pairs for cointegration",
      "Apply Kalman Filter + OU model to find the best mean-reverting pair",
    ],
    bestFor: "Moderate volatility markets with stable correlations",
  },
  {
    name: "VWAP Execution",
    risk: "Low",
    returnPct: "+8.3",
    description: "Executes large orders across time intervals to match the Volume Weighted Average Price, minimizing market impact.",
    status: "Institutional",
    detail: "VWAP (Volume Weighted Average Price) is an execution strategy. Large institutional orders can move the market if executed all at once. VWAP splits the order into smaller slices distributed throughout the day, matching the historical volume pattern.",
    howItWorks: [
      "Analyze historical intraday volume profiles to predict distribution",
      "Split the parent order into child orders proportional to expected volume",
      "Execute child orders at regular intervals throughout the trading day",
      "Monitor execution quality by comparing average fill price to market VWAP",
    ],
    bestFor: "Large institutional orders that need to minimize market impact",
  },
  {
    name: "Trend Following",
    risk: "Medium",
    returnPct: "+25.7",
    description: "Rides sustained price movements using breakout signals and trailing stops. Best in strong directional markets.",
    status: "Popular",
    detail: "Trend following is a systematic approach that aims to capture the bulk of a market trend — up or down. Unlike momentum, trend following uses breakout signals and doesn't predict direction. It simply follows the trend as it develops and exits when the trend reverses.",
    howItWorks: [
      "Identify breakouts using Donchian Channels or moving average crossovers",
      "Enter in the direction of the breakout",
      "Use trailing stops (ATR-based) to protect profits while letting winners run",
      "Exit when the trailing stop is hit or a reverse signal appears",
    ],
    bestFor: "Commodities, forex, and index futures with sustained trends",
  },
  {
    name: "Sentiment Analysis",
    risk: "High",
    returnPct: "+28.9",
    description: "Analyzes news and social media using NLP to gauge market sentiment and predict short-term price movements.",
    status: "Emerging",
    detail: "Sentiment analysis applies NLP to unstructured text — news articles, social media posts, earnings call transcripts — to gauge market sentiment. By quantifying positive/negative/neutral sentiment, algorithms can predict price movements before they're reflected in price.",
    howItWorks: [
      "Collect text data from news feeds, X, Reddit, and earnings calls",
      "Process text using NLP models (FinBERT) to extract sentiment scores",
      "Aggregate sentiment across sources weighted by recency and reliability",
      "Generate buy/sell signals when sentiment shifts significantly",
    ],
    bestFor: "Short-term trading around news events and earnings seasons",
  },
  {
    name: "Factor Investing",
    risk: "Low",
    returnPct: "+14.6",
    description: "Selects stocks based on quantitative factors: value, quality, size, and volatility to build optimized portfolios.",
    status: "Institutional",
    detail: "Factor investing systematically selects stocks based on quantifiable characteristics that historically drive returns. Known factors: Value, Momentum, Quality, Size, and Low Volatility. Multi-factor portfolios combine these for diversification.",
    howItWorks: [
      "Score each stock on multiple factors: Value (P/E, P/B), Quality (ROE, margins), Momentum",
      "Rank stocks within each factor and create quintile portfolios",
      "Combine factor scores into a composite ranking",
      "Build a diversified portfolio of top-ranked stocks, rebalance monthly",
    ],
    bestFor: "Long-term wealth building with systematic, rules-based investing",
  },
];

const RISK_FILTERS = ["All", "Low", "Medium", "High"] as const;

// ─────────────────────────────────────────
// Stat Pill Component
// ─────────────────────────────────────────
function StatPill({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</span>
      <span className={`text-lg font-bold tabular-nums ${positive === undefined ? "text-foreground" : positive ? "text-emerald-400" : "text-rose-400"}`}>
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────
// Live Signal Banner
// ─────────────────────────────────────────
function LiveSignalBanner({ signal, regime }: { signal: LiveSignal["signal"]; regime: string }) {
  const isBull = regime === "BULLISH";

  if (!signal) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/30">
          <Activity className="h-4 w-4 text-muted-foreground animate-pulse" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">No active signal — Z-score threshold not yet met</p>
        </div>
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${isBull ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
          {regime}
        </span>
      </div>
    );
  }

  const isBuy = signal.action.includes("BUY A");

  return (
    <div className={`relative overflow-hidden flex flex-wrap items-center gap-4 rounded-xl border px-4 py-3
      ${isBuy ? "border-emerald-500/20 bg-emerald-500/[0.04]" : "border-rose-500/20 bg-rose-500/[0.04]"}`}>
      <div className="absolute inset-0 pointer-events-none opacity-30"
        style={{ background: isBuy ? "radial-gradient(circle at 0% 50%, hsl(152 55% 40% / 0.15), transparent 60%)" : "radial-gradient(circle at 0% 50%, hsl(0 62% 50% / 0.15), transparent 60%)" }}
      />
      <div className="flex items-center gap-2.5 relative z-10">
        <span className={`flex h-2 w-2 rounded-full animate-ping absolute ${isBuy ? "bg-emerald-400" : "bg-rose-400"}`} />
        <span className={`flex h-2 w-2 rounded-full ${isBuy ? "bg-emerald-400" : "bg-rose-400"}`} />
        <span className="text-xs font-semibold text-foreground ml-2">{signal.pair}</span>
      </div>
      <div className="flex flex-wrap gap-3 relative z-10 text-[11px]">
        <span className={`font-bold ${isBuy ? "text-emerald-400" : "text-rose-400"}`}>{signal.action}</span>
        <span className="text-muted-foreground">z={signal.z_score.toFixed(2)}</span>
        <span className="text-muted-foreground">θ={signal.mean_reversion_speed}</span>
        <span className="text-muted-foreground">conf={Math.round(signal.confidence * 100)}%</span>
      </div>
      <span className={`ml-auto text-[10px] font-semibold px-2.5 py-1 rounded-full relative z-10 ${isBull ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
        {regime}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────
// Detail Modal
// ─────────────────────────────────────────
function StrategyModal({ strategy, onClose, closing }: { strategy: Strategy; onClose: () => void; closing: boolean }) {
  const riskColor = strategy.risk === "Low" ? "text-emerald-400" : strategy.risk === "Medium" ? "text-amber-400" : "text-rose-400";
  const isPositive = parseFloat(strategy.returnPct) >= 0;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 strategy-modal-overlay ${closing ? "closing" : ""}`}
      style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <div
        className={`strategy-modal-content relative w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-2xl border border-white/10
          bg-[hsl(220_20%_7%)] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] ${closing ? "closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {strategyIcons[strategy.name] || <Activity className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">{strategy.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-medium ${riskColor}`}>{strategy.risk} Risk</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className={`text-xs font-bold tabular-nums ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                    {isPositive ? "+" : ""}{strategy.returnPct}% avg return
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Detail */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">{strategy.detail}</p>

          {/* How it works */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">How It Works</h3>
            </div>
            <div className="space-y-2.5">
              {strategy.howItWorks.map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Best for */}
          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
            <Target className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">Best for: </span>
              {strategy.bestFor}
            </p>
          </div>

          {/* Risk note for high risk */}
          {strategy.risk === "High" && (
            <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-rose-500/5 border border-rose-500/15 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <p className="text-xs text-rose-400/80">High-risk strategy — requires strict position sizing and stop-losses.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────
const Strategies = () => {
  const [activeRisk, setActiveRisk] = useState<string>("All");
  const [selected, setSelected] = useState<Strategy | null>(null);
  const [closing, setClosing] = useState(false);
  const [liveSignal, setLiveSignal] = useState<LiveSignal | null>(null);
  const [signalLoading, setSignalLoading] = useState(true);
  const [marketOpen, setMarketOpen] = useState<boolean | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch live signal
  useEffect(() => {
    const fetchSignal = async () => {
      try {
        const res = await fetch("/strategy/signal");
        if (res.ok) setLiveSignal(await res.json());
      } catch {
        // silently fail
      } finally {
        setSignalLoading(false);
      }
    };

    const fetchMarket = async () => {
      try {
        const res = await fetch("/strategy/market-status");
        if (res.ok) {
          const data = await res.json();
          setMarketOpen(data.is_open);
        }
      } catch { /* ignore */ }
    };

    fetchSignal();
    fetchMarket();
    const id = setInterval(() => { fetchSignal(); fetchMarket(); }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Clock
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setSelected(null); setClosing(false); }, 200);
  }, []);

  const filtered = activeRisk === "All"
    ? strategies
    : strategies.filter((s) => s.risk === activeRisk);

  const engineStrategies = strategies.filter((s) => s.status === "Used in Engine").length;
  const avgReturn = (
    strategies.reduce((sum, s) => sum + parseFloat(s.returnPct), 0) / strategies.length
  ).toFixed(1);

  const istTime = currentTime.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto max-w-5xl px-6 pt-28 pb-20">

        {/* ── Header ── */}
        <div className="fade-up mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">Algo Strategy Library</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Trading Strategies
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                From market-neutral pairs to regime-adaptive models — explore the algorithms powering the engine.
              </p>
            </div>

            {/* Market status clock */}
            <div className="flex flex-col items-end gap-1">
              <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border
                ${marketOpen === true
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : marketOpen === false
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                    : "border-white/10 bg-white/5 text-muted-foreground"
                }`}>
                {marketOpen === true ? <Wifi className="h-3 w-3" /> : marketOpen === false ? <WifiOff className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {marketOpen === true ? "NSE OPEN" : marketOpen === false ? "NSE CLOSED" : "Checking..."}
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">{istTime} IST</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatPill label="Strategies" value={`${strategies.length}`} />
            <StatPill label="In Engine" value={`${engineStrategies}`} positive={true} />
            <StatPill label="Avg Return" value={`+${avgReturn}%`} positive={true} />
          </div>

          {/* Live Signal Banner */}
          <div className="fade-up fade-up-delay-1">
            {signalLoading ? (
              <div className="h-12 rounded-xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
            ) : (
              <LiveSignalBanner
                signal={liveSignal?.signal ?? null}
                regime={liveSignal?.regime ?? "—"}
              />
            )}
          </div>
        </div>

        {/* ── Risk Filter Tabs ── */}
        <div className="flex items-center gap-1.5 mb-6 fade-up fade-up-delay-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest mr-2">Filter</span>
          {RISK_FILTERS.map((f) => {
            const colors: Record<string, string> = {
              All: "data-[active=true]:bg-white/10 data-[active=true]:text-foreground",
              Low: "data-[active=true]:bg-emerald-500/15 data-[active=true]:text-emerald-400",
              Medium: "data-[active=true]:bg-amber-500/15 data-[active=true]:text-amber-400",
              High: "data-[active=true]:bg-rose-500/15 data-[active=true]:text-rose-400",
            };
            return (
              <button
                key={f}
                data-active={activeRisk === f}
                onClick={() => setActiveRisk(f)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-white/5 ${colors[f]}`}
              >
                {f}{f !== "All" && <span className="ml-1 opacity-50 text-[10px]">({strategies.filter(s => s.risk === f).length})</span>}
              </button>
            );
          })}
        </div>

        {/* ── Grid ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 fade-up fade-up-delay-3">
          {filtered.map((strategy) => (
            <StrategyCard
              key={strategy.name}
              name={strategy.name}
              risk={strategy.risk}
              returnPct={strategy.returnPct}
              description={strategy.description}
              status={strategy.status}
              isActive={selected?.name === strategy.name}
              onClick={() => setSelected(strategy)}
            />
          ))}
        </div>

        {/* ── Terminal Link CTA ── */}
        <div className="mt-12 fade-up fade-up-delay-4">
          <Link
            to="/strategies/backtest"
            className="group flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
          >
            <div className="flex items-start md:items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Terminal className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  Engine Execution Logs
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">LIVE</span>
                </h3>
                <p className="mt-1 text-sm text-muted-foreground w-full max-w-xl">
                  Watch the ML regime-detection engine execute trades and analyze markets in real-time. Run historical simulations dynamically.
                </p>
              </div>
            </div>
            <div className="flex h-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.03] px-4 text-sm font-semibold text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors md:self-center self-start">
              Open Terminal
            </div>
          </Link>
        </div>

        {/* ── Bottom note ── */}
        <div className="mt-10 flex items-center gap-2 text-xs text-muted-foreground/50 fade-up">
          <ChevronRight className="h-3 w-3" />
          <span>Click any card to explore the strategy in depth. Engine strategies run live against NSE data.</span>
        </div>
      </div>

      {/* ── Modal ── */}
      {selected && (
        <StrategyModal strategy={selected} onClose={handleClose} closing={closing} />
      )}
    </div>
  );
};

export default Strategies;
