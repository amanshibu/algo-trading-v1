import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { StockTicker } from "@/components/StockTicker";
import { TradingSimulation } from "@/components/TradingSimulation";
import { StatCard } from "@/components/StatCard";
import { GlassCard } from "@/components/GlassCard";
import { PaperPortfolioWidget } from "@/components/PaperPortfolioWidget";
import { ArrowRight, TrendingUp, Target, ShieldCheck } from "lucide-react";
import { getBacktest, getPortfolioPerformance } from "@/lib/api";

const Index = () => {
  const [dailyPnl, setDailyPnl] = useState<string>("...");
  const [dailyPnlChange, setDailyPnlChange] = useState<string>("");
  const [dailyPnlType, setDailyPnlType] = useState<"positive" | "negative" | "neutral">("neutral");
  const [winRate, setWinRate] = useState<string>("...");
  const [winRateChange, setWinRateChange] = useState<string>("");
  const [maxDrawdown, setMaxDrawdown] = useState<string>("...");
  const [maxDrawdownChange, setMaxDrawdownChange] = useState<string>("");
  const [maxDrawdownType, setMaxDrawdownType] = useState<"positive" | "negative" | "neutral">("neutral");
  const [perfData, setPerfData] = useState<{ month: string; value: number }[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Retry wrapper — retries up to `n` times with a short delay
    async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1500): Promise<T> {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          return await fn();
        } catch (err) {
          if (attempt === retries) throw err;
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
      throw new Error("Retry exhausted");
    }

    async function loadBacktest() {
      try {
        const bt = await withRetry(() => getBacktest());

        // Net P&L
        const pnl = bt.net_pnl ?? 0;
        const pnlSign = pnl >= 0 ? "+" : "-";
        setDailyPnl(`${pnlSign}₹${Math.abs(pnl).toLocaleString("en-IN")}`);
        const pnlPct = bt.initial_capital
          ? ((pnl / bt.initial_capital) * 100).toFixed(2)
          : "0";
        setDailyPnlChange(`${pnlSign}${Math.abs(Number(pnlPct))}% total`);
        setDailyPnlType(pnl >= 0 ? "positive" : "negative");

        // Win Rate
        if (bt.total_trades > 0) {
          const wr = ((bt.profit_trades / bt.total_trades) * 100).toFixed(1);
          setWinRate(`${wr}%`);
          setWinRateChange(`${bt.profit_trades} of ${bt.total_trades} trades`);
        } else {
          setWinRate("0%");
          setWinRateChange("No trades yet");
        }

        // Max Drawdown
        const dd = bt.max_drawdown_pct ?? 0;
        setMaxDrawdown(`-${dd}%`);
        if (dd <= 5) {
          setMaxDrawdownChange("Within risk limits");
          setMaxDrawdownType("neutral");
        } else if (dd <= 15) {
          setMaxDrawdownChange("Moderate risk");
          setMaxDrawdownType("neutral");
        } else {
          setMaxDrawdownChange("High risk");
          setMaxDrawdownType("negative");
        }
      } catch (err) {
        console.error("Backtest API failed:", err);
        // Set graceful fallback values instead of leaving "..."
        setDailyPnl("₹0");
        setDailyPnlChange("Data unavailable");
        setDailyPnlType("neutral");
        setWinRate("—");
        setWinRateChange("Data unavailable");
        setMaxDrawdown("—");
        setMaxDrawdownChange("Data unavailable");
        setMaxDrawdownType("neutral");
      }
    }

    async function loadPerformance() {
      try {
        const perf = await withRetry(() => getPortfolioPerformance());
        if (perf?.labels && perf?.equity) {
          setPerfData(
            perf.labels.map((label: string, i: number) => ({
              month: label,
              value: perf.equity[i],
            }))
          );
        }
      } catch (err) {
        console.error("Performance API failed:", err);
        // perfData stays null — chart will show empty state
      }
    }

    async function load() {
      // Run independently — one failure won't block the other
      await Promise.allSettled([loadBacktest(), loadPerformance()]);
      setLoading(false);
    }

    load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-8 px-6">
        {/* Ambient glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="container mx-auto max-w-5xl text-center relative">
          <div className="fade-up">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Algorithmic Trading Platform
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              AI-Driven Trading
              <br />
              <span className="text-gradient-accent">Strategies</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Data-driven, risk-managed investing powered by advanced machine learning.
              Systematic alpha generation with institutional-grade risk controls.
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-3 fade-up fade-up-delay-1">
            <Link
              to="/strategies"
              className="glass inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted/30"
            >
              View Strategies
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-5 py-2.5 text-sm font-medium text-primary transition-all duration-200 hover:bg-primary/20"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Ticker */}
      <section className="py-4">
        <StockTicker />
      </section>

      {/* Stats */}
      <section className="px-6 py-8">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 fade-up fade-up-delay-2">
            <StatCard
              label="Net P&L"
              value={loading ? "..." : dailyPnl}
              change={loading ? "" : dailyPnlChange}
              changeType={dailyPnlType}
              icon={TrendingUp}
            />
            <StatCard
              label="Win Rate"
              value={loading ? "..." : winRate}
              change={loading ? "" : winRateChange}
              changeType="positive"
              icon={Target}
            />
            <StatCard
              label="Max Drawdown"
              value={loading ? "..." : maxDrawdown}
              change={loading ? "" : maxDrawdownChange}
              changeType={maxDrawdownType}
              icon={ShieldCheck}
            />
          </div>
        </div>
      </section>

      {/* Paper Portfolio Widget — with tooltips for evaluators */}
      <section className="px-6 py-8">
        <div className="container mx-auto max-w-5xl fade-up fade-up-delay-3">
          <PaperPortfolioWidget />
        </div>
      </section>

      {/* Trading Simulation */}
      <section className="px-6 py-8">
        <div className="container mx-auto max-w-5xl fade-up fade-up-delay-3">
          <TradingSimulation />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 px-6 py-8 mt-12">
        <div className="container mx-auto max-w-5xl flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            © 2026 AlgoTrader. All rights reserved.
          </span>
          <span className="text-xs text-muted-foreground">
            Market data is simulated
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
