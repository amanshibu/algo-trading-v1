import { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { getBacktest } from "@/lib/api";

interface Trade {
  entry_date: string;
  exit_date: string;
  entry_price: number;
  exit_price: number;
  pnl: number;
}

export function TradesTable() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getBacktest();
        setTrades(data.trades ?? []);
      } catch (err) {
        console.error("Failed to load trades:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <GlassCard className="overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50">
        <h3 className="text-sm font-medium text-muted-foreground">Recent Trades</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/30">
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Entry Date</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Exit Date</th>
              <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Entry Price</th>
              <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Exit Price</th>
              <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">P&L</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-sm text-muted-foreground">
                  Loading trades...
                </td>
              </tr>
            ) : trades.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-sm text-muted-foreground">
                  No trades found
                </td>
              </tr>
            ) : (
              trades.map((trade, i) => (
                <tr key={i} className="border-b border-border/20 transition-colors hover:bg-muted/20">
                  <td className="px-5 py-3 text-sm text-foreground">
                    {new Date(trade.entry_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </td>
                  <td className="px-5 py-3 text-sm text-foreground">
                    {new Date(trade.exit_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-muted-foreground">
                    ₹{trade.entry_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-muted-foreground">
                    ₹{trade.exit_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`px-5 py-3 text-right text-sm font-semibold ${trade.pnl >= 0 ? "text-success" : "text-danger"}`}>
                    {trade.pnl >= 0 ? "+" : "-"}₹{Math.abs(trade.pnl).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
