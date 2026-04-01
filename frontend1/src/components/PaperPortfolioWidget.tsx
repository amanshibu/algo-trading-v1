import { useEffect, useState } from "react";
import { getPaperPortfolio } from "@/lib/api";
import { Link } from "react-router-dom";
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    Briefcase,
    ArrowRight,
    Info,
} from "lucide-react";

interface PortfolioState {
    balance: number;
    net_worth: number;
    total_unrealised_pnl: number;
    total_realised_pnl: number;
    positions: { ticker: string; action: string; unrealised_pnl: number; entry_price: number; current_price: number }[];
    history: unknown[];
    initial_balance: number;
}

function Tooltip({ text }: { text: string }) {
    const [show, setShow] = useState(false);
    return (
        <span
            className="relative inline-flex"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            <Info className="h-3 w-3 text-muted-foreground/50 hover:text-primary cursor-help transition-colors" />
            {show && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-lg glass-strong border border-border/50 px-3 py-2 text-[10px] text-muted-foreground leading-relaxed z-50 shadow-xl">
                    {text}
                    <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-border/50" />
                </span>
            )}
        </span>
    );
}

export function PaperPortfolioWidget() {
    const [data, setData] = useState<PortfolioState | null>(null);
    const [initialLoad, setInitialLoad] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const resp = await getPaperPortfolio();
                if (resp?.balance != null) setData(resp);
            } catch {
                /* noop */
            } finally {
                setInitialLoad(false);   // spinner only on first mount
            }
        }
        load();
        // Refresh portfolio every 15 s without flicker
        const interval = setInterval(load, 15000);
        return () => clearInterval(interval);
    }, []);

    if (initialLoad) {
        return (
            <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-center h-32">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            </div>
        );
    }

    if (!data) return null;

    const totalPnl = data.total_realised_pnl + data.total_unrealised_pnl;
    const pnlPct = data.initial_balance
        ? ((totalPnl / data.initial_balance) * 100).toFixed(2)
        : "0.00";
    const positive = totalPnl >= 0;

    const metrics = [
        {
            label: "Cash Balance",
            value: `₹${data.balance.toLocaleString("en-IN")}`,
            tooltip:
                "Cash remaining in your virtual wallet after all trades. This goes down when you execute trades and goes up when you close positions.",
            color: "text-foreground",
        },
        {
            label: "Net Worth",
            value: `₹${data.net_worth.toLocaleString("en-IN")}`,
            tooltip:
                "Total value = cash balance + current value of all open positions. Represents everything you own.",
            color: "text-foreground",
        },
        {
            label: "Unrealised P&L",
            value: `${data.total_unrealised_pnl >= 0 ? "+" : ""}₹${Math.abs(data.total_unrealised_pnl).toLocaleString("en-IN")}`,
            tooltip:
                "Paper profit/loss on positions still OPEN. The stock price has moved since you bought, but you haven't sold yet — so this profit isn't 'real' until you close the position.",
            color: data.total_unrealised_pnl >= 0 ? "text-emerald-400" : "text-red-400",
        },
        {
            label: "Realised P&L",
            value: `${data.total_realised_pnl >= 0 ? "+" : ""}₹${Math.abs(data.total_realised_pnl).toLocaleString("en-IN")}`,
            tooltip:
                "Profit/loss from positions you've CLOSED. This is actual profit/loss — the trade is done and the money has been returned to your wallet.",
            color: data.total_realised_pnl >= 0 ? "text-emerald-400" : "text-red-400",
        },
    ];

    return (
        <div className="glass rounded-2xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Briefcase className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Paper Trading Portfolio</h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Virtual Money · Live Prices</p>
                    </div>
                </div>
                <Link
                    to="/spectral"
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                    Trade Now
                    <ArrowRight className="h-3 w-3" />
                </Link>
            </div>

            {/* Big Balance + P&L */}
            <div className="flex items-end justify-between mb-5">
                <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                        Virtual Wallet
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                        ₹{data.balance.toLocaleString("en-IN")}
                    </p>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-1.5">
                        {positive ? (
                            <TrendingUp className="h-4 w-4 text-emerald-400" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-red-400" />
                        )}
                        <span
                            className={`text-lg font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}
                        >
                            {positive ? "+" : ""}₹{Math.abs(totalPnl).toLocaleString("en-IN")}
                        </span>
                    </div>
                    <p className={`text-[10px] font-medium ${positive ? "text-emerald-400/70" : "text-red-400/70"}`}>
                        {positive ? "+" : ""}{pnlPct}% total P&L
                    </p>
                </div>
            </div>

            {/* Metric Cards with Tooltips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {metrics.map((m) => (
                    <div key={m.label} className="glass-subtle rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-1 mb-1">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                {m.label}
                            </p>
                            <Tooltip text={m.tooltip} />
                        </div>
                        <p className={`text-sm font-bold font-mono ${m.color}`}>{m.value}</p>
                    </div>
                ))}
            </div>

            {/* Open Positions Summary */}
            {data.positions.length > 0 ? (
                <div>
                    <div className="flex items-center gap-1 mb-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Open Positions ({data.positions.length})
                        </p>
                        <Tooltip text="These are trades you've executed but haven't closed yet. Each shows the stock, whether you bought or shorted it, and how much profit/loss it's currently at." />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {data.positions.map((pos, i) => {
                            const pnl = pos.unrealised_pnl ?? 0;
                            const pnlPositive = pnl >= 0;
                            return (
                                <div
                                    key={`${pos.ticker}-${i}`}
                                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium border ${pnlPositive
                                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                                        : "bg-red-500/5 border-red-500/20 text-red-400"
                                        }`}
                                >
                                    <span className="font-semibold text-foreground">
                                        {pos.ticker.replace(".NS", "")}
                                    </span>
                                    <span className="text-[10px] uppercase opacity-70">{pos.action}</span>
                                    <span className="font-mono">
                                        {pnlPositive ? "+" : ""}₹{Math.abs(pnl).toFixed(2)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-border/40 px-4 py-3 text-center">
                    <p className="text-xs text-muted-foreground">
                        No open positions.{" "}
                        <Link to="/spectral" className="text-primary hover:underline">
                            Go to Spectral Analysis
                        </Link>{" "}
                        to execute your first paper trade!
                    </p>
                </div>
            )}

            {/* How It Works — Explainer for evaluators */}
            <details className="mt-4 group">
                <summary className="text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-primary transition-colors flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    How Paper Trading Works
                </summary>
                <div className="mt-2 glass-subtle rounded-xl px-4 py-3 text-[11px] text-muted-foreground leading-relaxed space-y-2">
                    <div className="flex items-start gap-2">
                        <span className="text-primary font-bold shrink-0">1.</span>
                        <p>
                            <strong className="text-foreground">Spectral Engine</strong> analyses 6 NSE stocks using
                            Laplacian smoothing (h = (I − αL)x) to find laggers (BUY) and leaders (SELL).
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-primary font-bold shrink-0">2.</span>
                        <p>
                            <strong className="text-foreground">Execute</strong> a trade → live price is fetched from
                            yfinance → the cost is deducted from your virtual wallet.
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-primary font-bold shrink-0">3.</span>
                        <p>
                            <strong className="text-foreground">Unrealised P&L</strong> shows how the stock price has
                            moved since your trade. It's "paper" profit — not real until you close.
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-primary font-bold shrink-0">4.</span>
                        <p>
                            <strong className="text-foreground">Close</strong> the position → money returns to your
                            wallet. Profit/loss moves from Unrealised → Realised.
                        </p>
                    </div>
                </div>
            </details>
        </div>
    );
}
