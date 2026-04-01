import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { GlassCard } from "./GlassCard";

const data = [
  { name: "Equities", value: 62, color: "hsl(152, 55%, 40%)" },
  { name: "Cash", value: 18, color: "hsl(220, 15%, 30%)" },
  { name: "Crypto", value: 12, color: "hsl(160, 35%, 50%)" },
  { name: "Bonds", value: 8, color: "hsl(220, 15%, 20%)" },
];

export function AllocationChart() {
  return (
    <GlassCard className="p-5">
      <h3 className="mb-4 text-sm font-medium text-muted-foreground">Allocation</h3>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(220, 20%, 8%)",
              border: "1px solid hsl(220, 15%, 18%)",
              borderRadius: "8px",
              fontSize: 12,
              color: "hsl(210, 20%, 90%)",
            }}
            formatter={(value: number) => [`${value}%`, ""]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 space-y-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-muted-foreground">{item.name}</span>
            </div>
            <span className="text-xs font-medium text-foreground">{item.value}%</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
