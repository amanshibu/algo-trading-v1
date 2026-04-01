import React, { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import {
  Play,
  Loader2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  DollarSign,
  Target,
  Activity,
  ChevronDown,
  ChevronUp,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import { getBacktestLogs, getBacktest } from "@/lib/api";

interface Trade {
  entry_date: string;
  exit_date: string;
  entry_price: number;
  exit_price: number;
  pnl: number;
}

interface BacktestResult {
  initial_capital: number;
  final_capital: number;
  total_trades: number;
  profit_trades: number;
  loss_trades: number;
  net_pnl: number;
  max_drawdown_pct: number;
  win_rate: number;
  avg_pnl: number;
  avg_win: number;
  avg_loss: number;
  return_pct: number;
  trades: Trade[];
}

function safeResult(data: any): BacktestResult {
  return {
    initial_capital: data.initial_capital ?? 0,
    final_capital: data.final_capital ?? 0,
    total_trades: data.total_trades ?? 0,
    profit_trades: data.profit_trades ?? 0,
    loss_trades: data.loss_trades ?? 0,
    net_pnl: data.net_pnl ?? 0,
    max_drawdown_pct: data.max_drawdown_pct ?? 0,
    win_rate: data.win_rate ?? 0,
    avg_pnl: data.avg_pnl ?? 0,
    avg_win: data.avg_win ?? 0,
    avg_loss: data.avg_loss ?? 0,
    return_pct: data.return_pct ?? 0,
    trades: data.trades ?? [],
  };
}

const BacktestLogs = () => {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [interval, setIntervalVal] = useState("1d");
  const [period, setPeriod] = useState("1y");
  const [maPeriod, setMaPeriod] = useState(10);
  const [showLogs, setShowLogs] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Load initial data
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const data = await getBacktest(interval, period, maPeriod);
        if (data && data.trades) setResult(safeResult(data));
      } catch {}
      try {
        const logData = await getBacktestLogs();
        if (logData?.logs) setLogs(logData.logs);
      } catch {}
    };
    loadInitial();
  }, []);

  const handleRunBacktest = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setResult(null);
    try {
      const data = await getBacktest(interval, period, maPeriod);
      if (data && data.trades !== undefined) setResult(safeResult(data));
      // Also refresh logs
      const logData = await getBacktestLogs();
      if (logData?.logs) setLogs(logData.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (showLogs) logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, showLogs]);

  const formatCurrency = (val: number) =>
    `₹${Math.abs(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="container mx-auto max-w-6xl px-6 pt-32 flex-1 flex flex-col pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">
                Engine Simulation
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Backtest Results
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              Run historical simulations to test strategy performance across different timeframes and intervals.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              disabled={isRunning}
              className="bg-white/[0.03] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="1mo">Period: 1 Month</option>
              <option value="3mo">Period: 3 Months</option>
              <option value="6mo">Period: 6 Months</option>
              <option value="1y">Period: 1 Year</option>
              <option value="2y">Period: 2 Years</option>
            </select>

            <select
              value={interval}
              onChange={(e) => setIntervalVal(e.target.value)}
              disabled={isRunning}
              className="bg-white/[0.03] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="1m">Interval: 1m</option>
              <option value="5m">Interval: 5m</option>
              <option value="15m">Interval: 15m</option>
              <option value="1h">Interval: 1H</option>
              <option value="1d">Interval: 1D</option>
              <option value="1wk">Interval: 1W</option>
              <option value="1mo">Interval: 1M</option>
            </select>

            <select
              value={maPeriod}
              onChange={(e) => setMaPeriod(Number(e.target.value))}
              disabled={isRunning}
              className="bg-white/[0.03] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value={5}>MA: 5</option>
              <option value={10}>MA: 10</option>
              <option value={20}>MA: 20</option>
              <option value={50}>MA: 50</option>
            </select>

            <button
              onClick={handleRunBacktest}
              disabled={isRunning}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg hover:shadow-primary/25 disabled:opacity-50"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isRunning ? "Running..." : "Run Backtest"}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isRunning && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground animate-pulse">
                Running backtest simulation...
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !isRunning && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* ── Summary Banner ── */}
            <div
              className={`rounded-xl border p-6 ${
                result.net_pnl >= 0
                  ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                  : "border-rose-500/30 bg-rose-500/[0.04]"
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                {result.net_pnl >= 0 ? (
                  <Trophy className="h-5 w-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-rose-400" />
                )}
                <span className="text-sm font-medium text-muted-foreground">
                  Strategy Performance
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-3">
                <span
                  className={`text-3xl font-bold ${
                    result.net_pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {result.net_pnl >= 0 ? "+" : "-"}
                  {formatCurrency(result.net_pnl)}
                </span>
                <span
                  className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                    result.return_pct >= 0
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/20 text-rose-400"
                  }`}
                >
                  {result.return_pct >= 0 ? "+" : ""}
                  {result.return_pct}%
                </span>
              </div>
            </div>

            {/* ── Stat Cards Grid ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<DollarSign className="h-4 w-4" />}
                label="Initial Capital"
                value={formatCurrency(result.initial_capital)}
              />
              <StatCard
                icon={<DollarSign className="h-4 w-4" />}
                label="Final Capital"
                value={formatCurrency(result.final_capital)}
                valueClass={
                  result.final_capital >= result.initial_capital
                    ? "text-emerald-400"
                    : "text-rose-400"
                }
              />
              <StatCard
                icon={<BarChart3 className="h-4 w-4" />}
                label="Total Trades"
                value={String(result.total_trades)}
              />
              <StatCard
                icon={<Target className="h-4 w-4" />}
                label="Win Rate"
                value={`${result.win_rate}%`}
                valueClass={
                  result.win_rate >= 50 ? "text-emerald-400" : "text-rose-400"
                }
              />
              <StatCard
                icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
                label="Winning Trades"
                value={String(result.profit_trades)}
                valueClass="text-emerald-400"
              />
              <StatCard
                icon={<TrendingDown className="h-4 w-4 text-rose-400" />}
                label="Losing Trades"
                value={String(result.loss_trades)}
                valueClass="text-rose-400"
              />
              <StatCard
                icon={<Activity className="h-4 w-4" />}
                label="Avg P&L / Trade"
                value={`${result.avg_pnl >= 0 ? "+" : "-"}${formatCurrency(result.avg_pnl)}`}
                valueClass={
                  result.avg_pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                }
              />
              <StatCard
                icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
                label="Max Drawdown"
                value={`${result.max_drawdown_pct}%`}
                valueClass="text-amber-400"
              />
            </div>

            {/* ── Trades Table ── */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Trade History
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    ({result.trades.length} trades)
                  </span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        #
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Entry Date
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Exit Date
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Entry Price
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Exit Price
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Change %
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        P&L
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-8 text-center text-sm text-muted-foreground"
                        >
                          No trades executed in this period.
                        </td>
                      </tr>
                    ) : (
                      result.trades.map((trade, i) => {
                        const changePct =
                          trade.entry_price > 0
                            ? (
                                ((trade.exit_price - trade.entry_price) /
                                  trade.entry_price) *
                                100
                              ).toFixed(2)
                            : "0.00";
                        const isProfit = trade.pnl >= 0;

                        return (
                          <tr
                            key={i}
                            className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
                          >
                            <td className="px-5 py-3 text-sm text-muted-foreground font-mono">
                              {i + 1}
                            </td>
                            <td className="px-5 py-3 text-sm text-foreground">
                              {formatDate(trade.entry_date)}
                            </td>
                            <td className="px-5 py-3 text-sm text-foreground">
                              {formatDate(trade.exit_date)}
                            </td>
                            <td className="px-5 py-3 text-right text-sm text-muted-foreground font-mono">
                              ₹{trade.entry_price.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-5 py-3 text-right text-sm text-muted-foreground font-mono">
                              ₹{trade.exit_price.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td
                              className={`px-5 py-3 text-right text-sm font-mono ${
                                isProfit
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {isProfit ? "+" : ""}
                              {changePct}%
                            </td>
                            <td
                              className={`px-5 py-3 text-right text-sm font-semibold font-mono ${
                                isProfit
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {isProfit ? "+" : "-"}₹
                              {Math.abs(trade.pnl).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Collapsible Raw Logs ── */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="w-full px-5 py-3 flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Activity className="h-4 w-4" />
                  Raw Execution Logs
                  <span className="text-xs opacity-60">({logs.length} lines)</span>
                </span>
                {showLogs ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {showLogs && (
                <div className="border-t border-white/[0.06] p-4 max-h-[400px] overflow-y-auto bg-[#0c0c0e] font-mono text-xs leading-relaxed text-white/70">
                  {logs.map((line, idx) => {
                    let colorClass = "text-white/60";
                    if (line.includes("PROFIT"))
                      colorClass = "text-emerald-400 font-bold";
                    else if (line.includes("LOSS"))
                      colorClass = "text-rose-400 font-semibold";
                    else if (line.includes("BUY"))
                      colorClass = "text-emerald-300";
                    else if (line.includes("SELL"))
                      colorClass = "text-rose-300";
                    else if (line.includes("==="))
                      colorClass = "text-muted-foreground opacity-40";
                    else if (line.includes("INFO"))
                      colorClass = "text-blue-400/70";

                    return (
                      <div key={idx} className={`mb-1 ${colorClass}`}>
                        {line}
                      </div>
                    );
                  })}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State (no result yet and not running) */}
        {!result && !isRunning && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              <div>
                <p className="text-lg font-medium text-foreground">
                  No backtest results yet
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Select a period and interval, then click{" "}
                  <span className="text-primary font-medium">Run Backtest</span>{" "}
                  to simulate.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Stat Card Component ── */
function StatCard({
  icon,
  label,
  value,
  valueClass = "text-foreground",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2 hover:bg-white/[0.04] transition-colors">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] uppercase tracking-wider font-medium">
          {label}
        </span>
      </div>
      <p className={`text-xl font-bold font-mono ${valueClass}`}>{value}</p>
    </div>
  );
}

export default BacktestLogs;
