import { Activity, TrendingUp, BarChart3, GitBranch, Zap, LineChart, Brain, DollarSign, Layers, ChevronRight } from "lucide-react";

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

interface StrategyCardProps {
  name: string;
  risk: "Low" | "Medium" | "High";
  returnPct: string;
  description: string;
  status: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function StrategyCard({ name, risk, returnPct, description, status, isActive, onClick }: StrategyCardProps) {
  const riskStyles = {
    Low: { dot: "bg-emerald-400", text: "text-emerald-400", ring: "ring-emerald-500/20" },
    Medium: { dot: "bg-amber-400", text: "text-amber-400", ring: "ring-amber-500/20" },
    High: { dot: "bg-rose-400", text: "text-rose-400", ring: "ring-rose-500/20" },
  }[risk];

  const isPositive = parseFloat(returnPct) >= 0;
  const isEngine = status === "Used in Engine";

  return (
    <div
      onClick={onClick}
      className={`group relative cursor-pointer rounded-2xl border transition-all duration-300 overflow-hidden
        ${isActive
          ? "border-primary/50 shadow-[0_0_30px_-8px_hsl(var(--primary)/0.4)] bg-primary/5"
          : "border-white/5 bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.05]"
        }`}
    >
      {/* Top glow accent bar */}
      {isEngine && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      )}

      {/* Subtle radial glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: "radial-gradient(circle at 30% 20%, hsl(var(--primary)/0.06), transparent 70%)" }}
      />

      <div className="relative z-10 p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Icon bubble */}
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-300
              ${isEngine ? "bg-primary/15 text-primary" : "bg-white/5 text-muted-foreground group-hover:text-foreground group-hover:bg-white/8"}`}>
              {strategyIcons[name] || <Activity className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground leading-tight">{name}</h3>
              {isEngine && (
                <span className="text-[10px] font-medium text-primary/80 tracking-wide">LIVE IN ENGINE</span>
              )}
            </div>
          </div>

          {/* Risk badge */}
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ring-1 ${riskStyles.ring} bg-black/20`}>
            <span className={`h-1.5 w-1.5 rounded-full ${riskStyles.dot} animate-pulse`} />
            <span className={riskStyles.text}>{risk}</span>
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4">{description}</p>

        {/* Stats row */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${isEngine ? "bg-primary" : "bg-muted-foreground/40"}`} />
            <span className="text-[11px] text-muted-foreground">{status}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-sm font-bold tabular-nums ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
              {isPositive ? "+" : ""}{returnPct}%
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all duration-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
