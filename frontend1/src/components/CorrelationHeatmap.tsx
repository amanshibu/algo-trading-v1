import { useEffect, useState } from "react";
import { getCorrelationHeatmap } from "@/lib/api";

interface HeatmapData {
    stocks: string[];
    matrix: number[][];
}

export function CorrelationHeatmap() {
    const [data, setData] = useState<HeatmapData | null>(null);
    const [loading, setLoading] = useState(true);
    const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number; value: number } | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const resp = await getCorrelationHeatmap();
                if (resp?.stocks?.length) setData(resp);
            } catch (e) {
                console.error("Failed to load heatmap:", e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) {
        return (
            <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                    Weight Matrix (W) — Correlation Heatmap
                </h3>
                <div className="flex items-center justify-center h-64">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                    Weight Matrix (W) — Correlation Heatmap
                </h3>
                <p className="text-sm text-muted-foreground">Unable to load heatmap data.</p>
            </div>
        );
    }

    const { stocks, matrix } = data;

    // Viridis colorscale: dark purple (low) → teal (mid) → bright yellow (high)
    // Stops: 0.0 → 0.25 → 0.5 → 0.75 → 1.0
    const viridisStops = [
        { t: 0.0, r: 68, g: 1, b: 84 },     // dark purple
        { t: 0.25, r: 59, g: 82, b: 139 },    // blue-purple
        { t: 0.5, r: 33, g: 145, b: 140 },    // teal
        { t: 0.75, r: 94, g: 201, b: 98 },    // green
        { t: 1.0, r: 253, g: 231, b: 37 },    // bright yellow
    ];

    function cellColor(val: number): string {
        // Map correlation [-1, 1] → [0, 1] for Viridis
        const t = Math.max(0, Math.min(1, (val + 1) / 2));

        // Find the two surrounding stops
        let lower = viridisStops[0];
        let upper = viridisStops[viridisStops.length - 1];
        for (let i = 0; i < viridisStops.length - 1; i++) {
            if (t >= viridisStops[i].t && t <= viridisStops[i + 1].t) {
                lower = viridisStops[i];
                upper = viridisStops[i + 1];
                break;
            }
        }

        const localT = (t - lower.t) / (upper.t - lower.t || 1);
        const r = Math.round(lower.r + (upper.r - lower.r) * localT);
        const g = Math.round(lower.g + (upper.g - lower.g) * localT);
        const b = Math.round(lower.b + (upper.b - lower.b) * localT);
        return `rgb(${r}, ${g}, ${b})`;
    }

    return (
        <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                        Weight Matrix (W) — Market Friendship Grid
                    </h3>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                        Yellow = perfect correlation (1.0) · Teal = moderate · Dark purple = independent/inverse
                    </p>
                </div>
                {hoveredCell && (
                    <div className="glass-subtle rounded-lg px-3 py-1.5 text-xs font-mono">
                        <span className="text-muted-foreground">{stocks[hoveredCell.row]} × {stocks[hoveredCell.col]}:</span>{" "}
                        <span className="text-foreground font-semibold">{hoveredCell.value.toFixed(4)}</span>
                    </div>
                )}
            </div>

            <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                    {/* Header row */}
                    <div className="flex">
                        <div className="w-20 shrink-0" />
                        {stocks.map((s) => (
                            <div
                                key={s}
                                className="flex-1 min-w-[60px] text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pb-2"
                            >
                                {s}
                            </div>
                        ))}
                    </div>

                    {/* Matrix rows */}
                    {matrix.map((row, i) => (
                        <div key={stocks[i]} className="flex">
                            <div className="w-20 shrink-0 flex items-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pr-2">
                                {stocks[i]}
                            </div>
                            {row.map((val, j) => (
                                <div
                                    key={`${i}-${j}`}
                                    className="flex-1 min-w-[60px] aspect-square flex items-center justify-center text-[10px] font-mono font-medium cursor-pointer transition-all duration-150 hover:scale-110 hover:z-10 rounded-sm mx-0.5 my-0.5"
                                    style={{ backgroundColor: cellColor(val) }}
                                    onMouseEnter={() => setHoveredCell({ row: i, col: j, value: val })}
                                    onMouseLeave={() => setHoveredCell(null)}
                                >
                                    <span className="text-white/90 drop-shadow-md text-[11px]">{val.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Color legend — Viridis */}
            <div className="flex items-center justify-center gap-3 mt-5 text-[10px] text-muted-foreground">
                <span>-1.0 (Independent)</span>
                <div
                    className="h-3.5 w-48 rounded-full"
                    style={{
                        background: "linear-gradient(90deg, rgb(68,1,84), rgb(59,82,139), rgb(33,145,140), rgb(94,201,98), rgb(253,231,37))",
                    }}
                />
                <span>+1.0 (Perfect)</span>
            </div>
        </div>
    );
}
