import { useEffect, useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { GlassCard } from "@/components/GlassCard";
import { PerformanceChart } from "@/components/PerformanceChart";
import { TradesTable } from "@/components/TradesTable";
import { StatCard } from "@/components/StatCard";
import { Wallet, TrendingUp, BarChart3, X, Loader2 } from "lucide-react";
import { getPortfolioSummary, getPortfolioPerformance, withdrawFunds } from "@/lib/api";

const Portfolio = () => {
  const [totalValue, setTotalValue] = useState<string>("...");
  const [allTimeReturn, setAllTimeReturn] = useState<string>("");
  const [dailyReturn, setDailyReturn] = useState<string>("...");
  const [dailyReturnChange, setDailyReturnChange] = useState<string>("");
  const [cash, setCash] = useState<string>("...");
  const [activeStrategies, setActiveStrategies] = useState<string>("...");
  const [perfData, setPerfData] = useState<{ month: string; value: number }[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Withdraw State
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

  const fetchPortfolioData = useCallback(async () => {
    try {
      const [summary, perf] = await Promise.all([
        getPortfolioSummary(),
        getPortfolioPerformance(),
      ]);

      // Total value
      const tv = summary.total_value ?? 0;
      setTotalValue(`₹${tv.toLocaleString("en-IN")}`);

      // All-time return (using 100k as initial)
      const initial = 100000;
      const allTimeAbs = tv - initial;
      const allTimePct = ((allTimeAbs / initial) * 100).toFixed(1);
      const sign = allTimeAbs >= 0 ? "+" : "";
      setAllTimeReturn(`${sign}₹${Math.abs(allTimeAbs).toLocaleString("en-IN")} (${sign}${allTimePct}%) all time`);

      // Daily P&L
      const dp = summary.daily_pnl ?? 0;
      const dpSign = dp >= 0 ? "+" : "";
      setDailyReturn(`${dpSign}₹${Math.abs(dp).toLocaleString("en-IN")}`);
      const dpPct = tv > 0 ? ((dp / tv) * 100).toFixed(2) : "0";
      setDailyReturnChange(`${dpSign}${dpPct}%`);

      // Cash
      const c = summary.cash ?? 0;
      setCash(`₹${c.toLocaleString("en-IN")}`);

      // Active strategies
      setActiveStrategies(String(summary.active_strategies ?? 0));

      // Performance chart data
      if (perf?.labels && perf?.equity) {
        setPerfData(
          perf.labels.map((label: string, i: number) => ({
            month: label,
            value: perf.equity[i],
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load portfolio data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  const handleWithdrawClick = () => {
    setWithdrawError("");
    setWithdrawAmount("");
    setShowWithdraw(true);
  };

  const handleWithdrawSubmit = async () => {
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setWithdrawError("Please enter a valid amount.");
      return;
    }
    setWithdrawError("");
    setIsWithdrawing(true);
    try {
      await withdrawFunds(amt);
      setShowWithdraw(false);
      setWithdrawAmount("");
      // Refresh portfolio data
      await fetchPortfolioData();
    } catch (err: any) {
      setWithdrawError(err.message || "Withdrawal failed.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />

      <div className="container mx-auto max-w-5xl px-6 pt-28 pb-16">
        {/* Portfolio Value */}
        <div className="fade-up text-center mb-10">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Total Portfolio Value
          </p>
          <h1 className="mt-2 text-5xl font-bold tracking-tight text-foreground">
            {loading ? "..." : totalValue}
          </h1>
          <p className="mt-2 text-sm font-medium text-success">
            {loading ? "" : allTimeReturn}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8 fade-up fade-up-delay-1">
          <StatCard
            label="Today's Return"
            value={loading ? "..." : dailyReturn}
            change={loading ? "" : dailyReturnChange}
            changeType="positive"
            icon={TrendingUp}
          />
          <StatCard
            label="Available Cash"
            value={loading ? "..." : cash}
            changeType="neutral"
            icon={Wallet}
            action={
              <button
                onClick={handleWithdrawClick}
                disabled={loading}
                className="rounded text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50 border border-primary/20 bg-primary/5 px-2 py-1"
              >
                Withdraw
              </button>
            }
          />
          <StatCard
            label="Active Strategies"
            value={loading ? "..." : activeStrategies}
            change="2 outperforming"
            changeType="positive"
            icon={BarChart3}
          />
        </div>

        {/* Chart */}
        <div className="mb-8 fade-up fade-up-delay-2">
          <GlassCard className="p-6 h-full">
            <PerformanceChart title="Portfolio Growth" data={perfData ?? undefined} />
          </GlassCard>
        </div>

        {/* Trades */}
        <div className="fade-up fade-up-delay-3">
          <TradesTable />
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <GlassCard className="w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowWithdraw(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold mb-2">Withdraw Funds</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Enter the amount you would like to withdraw from your available cash balance.
            </p>

            <div className="mb-6">
              <label className="text-xs font-medium text-muted-foreground">
                Withdraw Amount
              </label>
              <div className="mt-2 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0.00"
                  className="w-full rounded-xl bg-input/50 border border-border/50 py-3 pl-9 pr-4 text-lg font-medium text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  autoFocus
                />
              </div>
              <div className="mt-3 flex gap-2">
                {[1000, 5000, 10000, 25000].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setWithdrawAmount(preset.toString())}
                    className="flex-1 rounded-lg bg-muted/30 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
                  >
                    ₹{preset.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>
              {withdrawError && (
                <p className="mt-2 text-xs text-danger">{withdrawError}</p>
              )}
            </div>

            <button
              onClick={handleWithdrawSubmit}
              disabled={isWithdrawing || !withdrawAmount}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all flex items-center justify-center hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Withdrawal"
              )}
            </button>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default Portfolio;
