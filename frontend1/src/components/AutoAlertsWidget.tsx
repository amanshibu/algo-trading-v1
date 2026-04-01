import { useEffect, useState } from "react";
import { getAutoAlerts } from "@/lib/api";
import { TrendingUp, TrendingDown, Bell, Zap, Clock, ShieldAlert } from "lucide-react";

export function AutoAlertsWidget() {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [initialLoad, setInitialLoad] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const data = await getAutoAlerts();
                if (Array.isArray(data)) setAlerts(data);
            } catch (err) {
                console.error("Failed to load auto alerts", err);
            } finally {
                setInitialLoad(false);   // only show spinner on very first load
            }
        }
        load();
        // Poll for new alerts every 10 seconds (no flicker — spinner only on first load)
        const interval = setInterval(load, 10000);
        return () => clearInterval(interval);
    }, []);

    if (initialLoad) {
        return (
            <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                    Auto-Execution Engine
                </h3>
                <div className="flex items-center justify-center h-40">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            </div>
        );
    }

    return (
        <div className="glass rounded-2xl p-6 relative overflow-hidden">
            {/* Visual flair for "live AI" */}
            <div className="absolute top-0 right-0 p-6 pointer-events-none">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_2px_rgba(52,211,153,0.5)]" />
            </div>

            <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                    <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-foreground">
                        Auto-Trader Matrix
                    </h3>
                    <p className="text-[11px] text-muted-foreground/70 uppercase tracking-wide mt-0.5">
                        Real-time algorithmic log & execution reasoning
                    </p>
                </div>
            </div>

            {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border/50 rounded-xl">
                    <Clock className="h-6 w-6 text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">Scanning markets continuously.</p>
                    <p className="text-[10px] text-muted-foreground/60">No automated executions triggered yet today.</p>
                </div>
            ) : (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                    {alerts.map((a, i) => {
                        const isSL = a.action.includes("STOP-LOSS");
                        const isBuy = !isSL && a.action.includes("BUY");
                        const isSell = !isSL && (a.action.includes("SELL") || a.action.includes("CLOSE"));
                        return (
                            <div key={a.id || i} className={`glass-subtle rounded-xl p-4 flex flex-col gap-2 transition-all hover:bg-muted/10 border ${isSL ? "border-orange-500/40 bg-orange-500/5" : "border-transparent hover:border-border/30"}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isSL ? "bg-orange-500/15 text-orange-400 border border-orange-500/30" :
                                                isBuy ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                    isSell ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                                        "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                            }`}>
                                            {isSL ? <ShieldAlert className="h-3 w-3" /> : isBuy ? <TrendingUp className="h-3 w-3" /> : isSell ? <TrendingDown className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                                            {a.action}
                                        </span>
                                        <span className="text-sm font-bold text-foreground">{a.ticker}</span>
                                        <span className="text-[10px] font-medium text-muted-foreground bg-background/50 px-2 py-0.5 rounded-md border border-border/40">
                                            {a.strategy}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-muted-foreground bg-muted/20 px-2 py-1 rounded-md">{a.timestamp.split(" ")[1]}</span>
                                </div>

                                <div className="mt-1">
                                    <div className="text-[11px] leading-relaxed text-muted-foreground flex items-baseline gap-1.5">
                                        <span className="font-semibold text-foreground/70 uppercase tracking-wider text-[9px]">Logic:</span>
                                        <span>{a.reason}</span>
                                    </div>
                                </div>

                                {a.details && (
                                    <div className="mt-1.5 pt-1.5 border-t border-border/30 flex items-center gap-1.5">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                                        <span className="text-[10px] font-mono text-primary/90">
                                            {a.details}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
