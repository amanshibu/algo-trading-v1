import { useEffect, useState } from "react";
import { getSpectralSignal, executePaperTrade, getPaperPortfolio } from "@/lib/api";
import { TrendingUp, TrendingDown, Minus, Play, X, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface SpectralData {
    stocks: string[];
    raw: number[];
    smoothed: number[];
    residuals: number[];
    signals: {
        ticker: string;
        action: string;
        reason: string;
        residual: number;
    }[];
    params: {
        alpha: number;
        corr_threshold: number;
        signal_threshold: number;
    };
    generated_at?: string;
}

interface PaperPortfolio {
    balance: number;
    positions: {
        ticker: string;
        action: string;
        qty: number;
        entry_price: number;
        entry_time: string;
        current_price?: number;
        unrealised_pnl?: number;
    }[];
    history: {
        ticker: string;
        action: string;
        entry_price: number;
        exit_price: number;
        entry_time: string;
        exit_time: string;
        pnl: number;
    }[];
    net_worth: number;
    total_realised_pnl: number;
    total_unrealised_pnl: number;
}

export function SpectralSignal({
    onPortfolioUpdate,
}: {
    onPortfolioUpdate?: (p: PaperPortfolio) => void;
}) {
    const [data, setData] = useState<SpectralData | null>(null);
    const [portfolio, setPortfolio] = useState<PaperPortfolio | null>(null);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState<string | null>(null);
    const [tradeMessage, setTradeMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    async function loadData() {
        try {
            const [spectral, port] = await Promise.all([getSpectralSignal(), getPaperPortfolio()]);
            if (spectral?.stocks?.length) setData(spectral);
            if (port) {
                setPortfolio(port);
                onPortfolioUpdate?.(port);
            }
        } catch (e) {
            console.error("Failed to load:", e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    async function handleExecute(ticker: string, action: string) {
        setExecuting(ticker);
        setTradeMessage(null);
        try {
            const result = await executePaperTrade(ticker, action, 1);
            if (result.error) {
                setTradeMessage({ text: result.error, type: "error" });
            } else {
                setTradeMessage({
                    text: `${action} ${ticker} @ ₹${result.trade?.entry_price?.toLocaleString("en-IN") ?? "—"} executed!`,
                    type: "success",
                });
                // Refresh portfolio
                const port = await getPaperPortfolio();
                if (port) {
                    setPortfolio(port);
                    onPortfolioUpdate?.(port);
                }
            }
        } catch (e) {
            setTradeMessage({ text: "Trade execution failed", type: "error" });
        } finally {
            setExecuting(null);
        }
    }

    async function handleClose(ticker: string) {
        setExecuting(ticker);
        setTradeMessage(null);
        try {
            const result = await executePaperTrade(ticker, "CLOSE", 1);
            if (result.error) {
                setTradeMessage({ text: result.error, type: "error" });
            } else {
                const pnlSign = result.pnl >= 0 ? "+" : "";
                setTradeMessage({
                    text: `Closed ${ticker} — P&L: ${pnlSign}₹${Math.abs(result.pnl).toLocaleString("en-IN")}`,
                    type: result.pnl >= 0 ? "success" : "error",
                });
                const port = await getPaperPortfolio();
                if (port) {
                    setPortfolio(port);
                    onPortfolioUpdate?.(port);
                }
            }
        } catch {
            setTradeMessage({ text: "Failed to close position", type: "error" });
        } finally {
            setExecuting(null);
        }
    }

    if (loading) {
        return (
            <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                    Laplacian Smoothing — Spectral Signal
                </h3>
                <div className="flex items-center justify-center h-64">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                    Laplacian Smoothing — Spectral Signal
                </h3>
                <p className="text-sm text-muted-foreground">Unable to load spectral signal data.</p>
            </div>
        );
    }

    const { stocks, raw, smoothed, signals, params } = data;
    const allVals = [...raw, ...smoothed];
    const maxAbs = Math.max(...allVals.map(Math.abs), 0.0001);

    function barHeight(val: number): number {
        return Math.min((Math.abs(val) / maxAbs) * 100, 100);
    }

    function barColor(val: number): string {
        return val >= 0 ? "hsl(152 55% 40%)" : "hsl(0 62% 50%)";
    }

    // Check if a ticker has an open position
    function hasPosition(ticker: string): boolean {
        const yf = ticker.includes(".NS") ? ticker : `${ticker}.NS`;
        return portfolio?.positions?.some((p) => p.ticker === yf) ?? false;
    }

    return (
        <div className="space-y-6">
            {/* Chart: Raw vs Smoothed */}
            <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                            Laplacian Smoothing Effect
                        </h3>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                            Raw signal (x) vs Smoothed signal h = (I − αL)x. The difference reveals laggers and leaders.
                        </p>
                    </div>
                    {/* Timestamp */}
                    {data.generated_at && (
                        <div className="flex items-center gap-1.5 glass-subtle rounded-lg px-3 py-1.5">
                            <Clock className="h-3 w-3 text-primary" />
                            <span className="text-[10px] font-mono text-muted-foreground">
                                {data.generated_at}
                            </span>
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-5 rounded-sm bg-primary/60" />
                        <span>Raw Signal (x)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-0.5 w-5 rounded-full bg-amber-400" />
                        <span>Smoothed (h)</span>
                    </div>
                </div>

                {/* Bar chart */}
                <div className="flex items-end justify-around gap-2" style={{ height: "200px" }}>
                    {stocks.map((stock, i) => {
                        const rawVal = raw[i];
                        const smoothVal = smoothed[i];
                        return (
                            <div key={stock} className="flex-1 flex flex-col items-center gap-1 relative h-full justify-end">
                                <div
                                    className="absolute w-full flex justify-center pointer-events-none"
                                    style={{ bottom: `${barHeight(smoothVal)}%` }}
                                >
                                    <div className="w-8 h-0.5 bg-amber-400 rounded-full shadow-lg shadow-amber-400/30" />
                                </div>
                                <div
                                    className="w-6 rounded-t-md transition-all duration-500 relative group"
                                    style={{
                                        height: `${barHeight(rawVal)}%`,
                                        backgroundColor: barColor(rawVal),
                                        opacity: 0.6,
                                        minHeight: "2px",
                                    }}
                                >
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                                        <div className="glass-subtle rounded-lg px-2 py-1 text-[10px] font-mono whitespace-nowrap">
                                            <div>x: {(rawVal * 100).toFixed(3)}%</div>
                                            <div>h: {(smoothVal * 100).toFixed(3)}%</div>
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[10px] font-semibold text-muted-foreground mt-1 uppercase tracking-wider">
                                    {stock}
                                </span>
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center justify-center gap-6 mt-4 text-[10px] text-muted-foreground/60 font-mono">
                    <span>α = {params.alpha}</span>
                    <span>corr threshold = {params.corr_threshold}</span>
                    <span>signal threshold = {params.signal_threshold}</span>
                </div>
            </div>

            {/* Trade Execution Message */}
            {tradeMessage && (
                <div
                    className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all ${tradeMessage.type === "success"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                >
                    {tradeMessage.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                        <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    {tradeMessage.text}
                    <button
                        onClick={() => setTradeMessage(null)}
                        className="ml-auto text-current opacity-50 hover:opacity-100"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* Trade Signals Table with Execute Buttons */}
            <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                            Spectral Trade Signals
                        </h3>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                            Live signals from the Spectral Engine. The background Auto-Trader daemon will autonomously execute these trades.
                        </p>
                    </div>
                    {portfolio && (
                        <div className="glass-subtle rounded-lg px-3 py-1.5 text-xs">
                            <span className="text-muted-foreground">Balance: </span>
                            <span className="text-foreground font-semibold font-mono">
                                ₹{portfolio.balance.toLocaleString("en-IN")}
                            </span>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border/50">
                                <th className="text-left py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ticker</th>
                                <th className="text-left py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                                <th className="text-left py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Residual (e)</th>
                                <th className="text-left py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {signals.map((sig) => {
                                const actionColor =
                                    sig.action === "BUY"
                                        ? "text-emerald-400 bg-emerald-400/10"
                                        : sig.action === "SELL"
                                            ? "text-red-400 bg-red-400/10"
                                            : "text-yellow-400 bg-yellow-400/10";
                                const ActionIcon =
                                    sig.action === "BUY" ? TrendingUp : sig.action === "SELL" ? TrendingDown : Minus;

                                const inPosition = hasPosition(sig.ticker);

                                return (
                                    <tr key={sig.ticker} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                                        <td className="py-2.5 px-3 font-semibold text-foreground text-xs">{sig.ticker}</td>
                                        <td className="py-2.5 px-3">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${actionColor}`}>
                                                <ActionIcon className="h-3 w-3" />
                                                {sig.action}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">
                                            {sig.residual >= 0 ? "+" : ""}{sig.residual.toFixed(6)}
                                        </td>
                                        <td className="py-2.5 px-3 text-xs text-muted-foreground">{sig.reason}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Open Positions */}
            {portfolio && portfolio.positions.length > 0 && (
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                        Open Positions
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/50">
                                    <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ticker</th>
                                    <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Side</th>
                                    <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Entry</th>
                                    <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Current</th>
                                    <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">P&L</th>
                                    <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
                                    <th className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {portfolio.positions.map((pos, i) => {
                                    const pnlColor = (pos.unrealised_pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400";
                                    return (
                                        <tr key={`${pos.ticker}-${i}`} className="border-b border-border/20">
                                            <td className="py-2 px-3 font-semibold text-foreground text-xs">{pos.ticker.replace(".NS", "")}</td>
                                            <td className="py-2 px-3 text-xs">
                                                <span className={pos.action === "BUY" ? "text-emerald-400" : "text-red-400"}>
                                                    {pos.action}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 font-mono text-xs text-muted-foreground">₹{pos.entry_price.toLocaleString("en-IN")}</td>
                                            <td className="py-2 px-3 font-mono text-xs text-muted-foreground">₹{(pos.current_price ?? 0).toLocaleString("en-IN")}</td>
                                            <td className={`py-2 px-3 font-mono text-xs font-semibold ${pnlColor}`}>
                                                {(pos.unrealised_pnl ?? 0) >= 0 ? "+" : ""}₹{Math.abs(pos.unrealised_pnl ?? 0).toLocaleString("en-IN")}
                                            </td>
                                            <td className="py-2 px-3 text-[10px] text-muted-foreground">{pos.entry_time}</td>
                                            <td className="py-2 px-3 text-right">
                                                <button
                                                    onClick={() => handleClose(pos.ticker.replace(".NS", ""))}
                                                    className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold"
                                                >
                                                    CLOSE
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Trade History */}
            {portfolio && portfolio.history.length > 0 && (
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                        Trade History
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/50">
                                    <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ticker</th>
                                    <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Side</th>
                                    <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Entry</th>
                                    <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Exit</th>
                                    <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">P&L</th>
                                    <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Closed At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {portfolio.history.slice().reverse().map((t, i) => {
                                    const pnlColor = t.pnl >= 0 ? "text-emerald-400" : "text-red-400";
                                    return (
                                        <tr key={i} className="border-b border-border/20">
                                            <td className="py-2 px-3 font-semibold text-foreground text-xs">{t.ticker.replace(".NS", "")}</td>
                                            <td className="py-2 px-3 text-xs">
                                                <span className={t.action === "BUY" ? "text-emerald-400" : "text-red-400"}>{t.action}</span>
                                            </td>
                                            <td className="py-2 px-3 font-mono text-xs text-muted-foreground">₹{t.entry_price.toLocaleString("en-IN")}</td>
                                            <td className="py-2 px-3 font-mono text-xs text-muted-foreground">₹{t.exit_price.toLocaleString("en-IN")}</td>
                                            <td className={`py-2 px-3 font-mono text-xs font-semibold ${pnlColor}`}>
                                                {t.pnl >= 0 ? "+" : ""}₹{Math.abs(t.pnl).toLocaleString("en-IN")}
                                            </td>
                                            <td className="py-2 px-3 text-[10px] text-muted-foreground">{t.exit_time}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
