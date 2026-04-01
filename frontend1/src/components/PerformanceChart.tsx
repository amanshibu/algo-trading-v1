import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const defaultData = [
  { month: "Jan", value: 100000 },
  { month: "Feb", value: 108500 },
  { month: "Mar", value: 105200 },
  { month: "Apr", value: 118700 },
  { month: "May", value: 124300 },
  { month: "Jun", value: 119800 },
  { month: "Jul", value: 132500 },
  { month: "Aug", value: 141200 },
  { month: "Sep", value: 138900 },
  { month: "Oct", value: 152400 },
  { month: "Nov", value: 163800 },
  { month: "Dec", value: 178500 },
];

interface PerformanceChartProps {
  title?: string;
  className?: string;
  data?: { month: string; value: number }[];
}

export function PerformanceChart({
  title = "Strategy Performance",
  className,
  data,
}: PerformanceChartProps) {
  const chartData = data ?? defaultData;

  return (
    <div className={className}>
      {title && (
        <h3 className="mb-4 text-sm font-medium text-muted-foreground">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(152, 55%, 40%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(152, 55%, 40%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsla(220, 15%, 20%, 0.3)"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "hsl(215, 12%, 50%)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(215, 12%, 50%)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(220, 20%, 8%)",
              border: "1px solid hsl(220, 15%, 18%)",
              borderRadius: "8px",
              fontSize: 12,
              color: "hsl(210, 20%, 90%)",
            }}
            formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Value"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(152, 55%, 40%)"
            strokeWidth={2}
            fill="url(#chartGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
