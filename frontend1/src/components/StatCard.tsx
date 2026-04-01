import { GlassCard } from "./GlassCard";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export function StatCard({ label, value, change, changeType = "neutral", icon: Icon, action }: StatCardProps) {
  const changeColor =
    changeType === "positive"
      ? "text-success"
      : changeType === "negative"
        ? "text-danger"
        : "text-muted-foreground";

  return (
    <GlassCard hover className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          <div className="flex items-center gap-3">
            {change && (
              <p className={`mt-1 text-xs font-medium ${changeColor}`}>{change}</p>
            )}
            {action && <div className="mt-1">{action}</div>}
          </div>
        </div>
        {Icon && (
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/5">
            <Icon className="h-4 w-4 text-primary/70" />
          </div>
        )}
      </div>
    </GlassCard>
  );
}
