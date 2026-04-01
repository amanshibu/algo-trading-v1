import { ResponsiveContainer, LineChart, Line } from "recharts";

interface SparklineChartProps {
  data: number[];
  color?: string;
}

export function SparklineChart({ data, color = "hsl(152, 55%, 40%)" }: SparklineChartProps) {
  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
