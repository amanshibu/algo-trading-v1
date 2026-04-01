import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { getTickerPrices } from "@/lib/api";

interface TickerItem {
  symbol: string;
  price: string;
  change: number;
}

function TickerChip({ item }: { item: TickerItem }) {
  const isUp = item.change >= 0;
  return (
    <div className="glass-subtle flex items-center gap-3 rounded-lg px-4 py-2.5 mx-2 min-w-fit">
      <span className="text-xs font-semibold text-foreground">{item.symbol}</span>
      <span className="text-xs text-muted-foreground">₹{item.price}</span>
      <span className={`flex items-center gap-0.5 text-xs font-medium ${isUp ? "text-success" : "text-danger"}`}>
        {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isUp ? "+" : ""}
        {item.change}%
      </span>
    </div>
  );
}

export function StockTicker() {
  const [tickers, setTickers] = useState<TickerItem[]>([]);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const data = await getTickerPrices();
        if (Array.isArray(data) && data.length > 0) {
          setTickers(data);
        }
      } catch {
        // keep existing data on error
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60_000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  if (tickers.length === 0) {
    return (
      <div className="relative w-full overflow-hidden py-4">
        <div className="ticker-scroll flex">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-subtle flex items-center gap-3 rounded-lg px-4 py-2.5 mx-2 min-w-fit">
              <span className="h-3 w-12 rounded bg-muted/50 animate-pulse" />
              <span className="h-3 w-16 rounded bg-muted/50 animate-pulse" />
              <span className="h-3 w-10 rounded bg-muted/50 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden py-4">
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10" />
      <div className="ticker-scroll flex">
        {[...tickers, ...tickers].map((item, i) => (
          <TickerChip key={`${item.symbol}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}
