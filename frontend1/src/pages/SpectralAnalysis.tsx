import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { CorrelationHeatmap } from "@/components/CorrelationHeatmap";
import { SpectralSignal } from "@/components/SpectralSignal";
import { AutoAlertsWidget } from "@/components/AutoAlertsWidget";
import { Activity, Waves, User, Wallet, TrendingUp, TrendingDown, LogOut, Plus, RotateCcw } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { getPaperPortfolio, resetPaperPortfolio } from "@/lib/api";

const SpectralAnalysis = () => {
    const { isLoggedIn, user, logout } = useAuth();
    const navigate = useNavigate();

    const displayName = isLoggedIn && user ? user.name : "Elias Paul";

    // Paper portfolio state for sidebar
    const [balance, setBalance] = useState(100000);
    const [netWorth, setNetWorth] = useState(100000);
    const [unrealisedPnl, setUnrealisedPnl] = useState(0);
    const [realisedPnl, setRealisedPnl] = useState(0);
    const [openCount, setOpenCount] = useState(0);

    // Load + poll portfolio every 15 s for live sidebar stats
    useEffect(() => {
        async function load() {
            try {
                const p = await getPaperPortfolio();
                if (p) updateSidebar(p);
            } catch { /* noop */ }
        }
        load();
        const interval = setInterval(load, 15000);
        return () => clearInterval(interval);
    }, []);

    function updateSidebar(p: {
        balance: number;
        net_worth: number;
        total_unrealised_pnl: number;
        total_realised_pnl: number;
        positions: unknown[];
    }) {
        setBalance(p.balance);
        setNetWorth(p.net_worth);
        setUnrealisedPnl(p.total_unrealised_pnl);
        setRealisedPnl(p.total_realised_pnl);
        setOpenCount(p.positions.length);
    }

    async function handleReset() {
        try {
            const res = await resetPaperPortfolio();
            if (res.balance != null) {
                setBalance(res.balance);
                setNetWorth(res.balance);
                setUnrealisedPnl(0);
                setRealisedPnl(0);
                setOpenCount(0);
            }
        } catch { /* noop */ }
    }

    function handleLogout() {
        logout();
        navigate("/");
    }

    const totalPnl = realisedPnl + unrealisedPnl;
    const pnlPositive = totalPnl >= 0;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            {/* Fixed Sidebar — Wallet Panel */}
            <aside className="fixed left-0 top-16 bottom-0 w-60 glass-strong border-r border-border/30 z-30 hidden lg:flex flex-col py-6 px-4 overflow-y-auto">
                {/* User Info */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                        <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">{displayName}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {isLoggedIn ? "Authenticated" : "Demo Mode"}
                        </p>
                    </div>
                </div>

                {/* Virtual Wallet */}
                <div className="glass-subtle rounded-xl px-4 py-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Virtual Wallet
                        </span>
                    </div>
                    <p className="text-xl font-bold text-foreground">
                        ₹{balance.toLocaleString("en-IN")}
                    </p>
                    <p className={`text-[10px] font-medium mt-0.5 flex items-center gap-0.5 ${pnlPositive ? "text-emerald-400" : "text-red-400"}`}>
                        {pnlPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                        {pnlPositive ? "+" : ""}₹{Math.abs(totalPnl).toLocaleString("en-IN")} total P&L
                    </p>
                </div>

                {/* Net Worth */}
                <div className="glass-subtle rounded-xl px-4 py-2.5 mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Net Worth</p>
                    <p className="text-sm font-bold text-foreground">₹{netWorth.toLocaleString("en-IN")}</p>
                </div>

                {/* Live Stats */}
                <div className="space-y-2 mb-4">
                    <div className="glass-subtle rounded-lg px-3 py-2 flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Open Positions</p>
                        <p className="text-xs font-bold text-foreground">{openCount}</p>
                    </div>
                    <div className="glass-subtle rounded-lg px-3 py-2 flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Unrealised P&L</p>
                        <p className={`text-xs font-bold ${unrealisedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {unrealisedPnl >= 0 ? "+" : ""}₹{Math.abs(unrealisedPnl).toLocaleString("en-IN")}
                        </p>
                    </div>
                    <div className="glass-subtle rounded-lg px-3 py-2 flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Realised P&L</p>
                        <p className={`text-xs font-bold ${realisedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {realisedPnl >= 0 ? "+" : ""}₹{Math.abs(realisedPnl).toLocaleString("en-IN")}
                        </p>
                    </div>
                </div>

                {/* Strategy Info */}
                <div className="glass-subtle rounded-lg px-3 py-2 mb-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Strategy</p>
                    <p className="text-xs font-semibold text-foreground">Spectral Alpha (GSP)</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">α=0.5 · 6 NSE Stocks</p>
                </div>

                {/* Add Funds */}
                <Link
                    to="/add-funds"
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-all hover:bg-primary/20 mb-2"
                >
                    <Plus className="h-3 w-3" />
                    Add Virtual Funds
                </Link>

                {/* Bottom Actions */}
                <div className="mt-auto space-y-2">
                    <button
                        onClick={handleReset}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-400 transition-all hover:bg-amber-500/20"
                    >
                        <RotateCcw className="h-3 w-3" />
                        Reset Portfolio
                    </button>
                    {isLoggedIn ? (
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20"
                        >
                            <LogOut className="h-3 w-3" />
                            Logout
                        </button>
                    ) : (
                        <Link
                            to="/login"
                            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-all hover:bg-primary/20"
                        >
                            Login for Live Trading
                        </Link>
                    )}
                </div>
            </aside>

            {/* Main Content — shifted right on large screens */}
            <div className="lg:ml-60">
                {/* Hero */}
                <section className="relative pt-28 pb-6 px-6">
                    <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[500px] h-[350px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
                    <div className="container mx-auto max-w-5xl relative">
                        <div className="fade-up">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                    <Waves className="h-4 w-4 text-primary" />
                                </div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                                    Graph Signal Processing
                                </p>
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                                Spectral Alpha{" "}
                                <span className="text-gradient-accent">Analysis</span>
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                                Laplacian smoothing on correlated stock returns to detect laggers (BUY)
                                and leaders (SELL). Execute paper trades with virtual money.
                            </p>
                        </div>

                        {/* Math explanation cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 fade-up fade-up-delay-1">
                            <div className="glass-subtle rounded-xl px-4 py-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Activity className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Step 1</span>
                                </div>
                                <p className="text-xs text-foreground font-medium">Build Weight Matrix W</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Correlation of stock returns → adjacency graph</p>
                            </div>
                            <div className="glass-subtle rounded-xl px-4 py-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Activity className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Step 2</span>
                                </div>
                                <p className="text-xs text-foreground font-medium">Laplacian Smoothing</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">h = (I − αL)·x smooths returns toward neighbours</p>
                            </div>
                            <div className="glass-subtle rounded-xl px-4 py-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Activity className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Step 3</span>
                                </div>
                                <p className="text-xs text-foreground font-medium">Residual Signals</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">e = x − h reveals laggers (BUY) &amp; leaders (SELL)</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Heatmap */}
                <section className="px-6 py-6">
                    <div className="container mx-auto max-w-5xl fade-up fade-up-delay-2">
                        <CorrelationHeatmap />
                    </div>
                </section>

                {/* Spectral Signal + Paper Trading */}
                <section className="px-6 py-6">
                    <div className="container mx-auto max-w-5xl fade-up fade-up-delay-3">
                        <SpectralSignal onPortfolioUpdate={updateSidebar} />
                    </div>
                </section>

                {/* Auto Alerts Matrix */}
                <section className="px-6 py-6">
                    <div className="container mx-auto max-w-5xl fade-up fade-up-delay-4">
                        <AutoAlertsWidget />
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-border/30 px-6 py-8 mt-8">
                    <div className="container mx-auto max-w-5xl flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">© 2026 AlgoTrader — Spectral Alpha Module</span>
                        <span className="text-xs text-muted-foreground">Math: L = D − W, h = (I − αL)x</span>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default SpectralAnalysis;
