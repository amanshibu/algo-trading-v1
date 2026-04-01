import React, { useEffect, useState, useRef, useMemo } from 'react';
import { TrendingUp, TrendingDown, BarChart2, Pause, Play } from 'lucide-react';

interface Tick {
    time: number;
    price: number;
    type?: 'BUY' | 'SELL';
    regime: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    volume: number;
}

const MAX_POINTS = 80;
const TICK_INTERVAL_MS = 400;

function smoothPath(points: { x: number; y: number }[]): string {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx = (prev.x + curr.x) / 2;
        d += ` C ${cpx} ${prev.y} ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
    }
    return d;
}

export function TradingSimulation() {
    const [ticks, setTicks] = useState<Tick[]>([]);
    const [equity, setEquity] = useState(100000);
    const [isSimulating, setIsSimulating] = useState(true);
    const [regime, setRegime] = useState<'BULLISH' | 'BEARISH' | 'NEUTRAL'>('NEUTRAL');

    const priceRef = useRef(150.25);
    const equityRef = useRef(100000);
    const regimeRef = useRef<'BULLISH' | 'BEARISH' | 'NEUTRAL'>('NEUTRAL');
    const positionRef = useRef<'LONG' | 'SHORT' | 'NONE'>('NONE');
    const entryPriceRef = useRef(0);

    // Initialize with history
    useEffect(() => {
        let initialTicks: Tick[] = [];
        let p = 148.0;
        for (let i = 0; i < MAX_POINTS; i++) {
            const reg: 'BULLISH' | 'BEARISH' = Math.random() > 0.5 ? 'BULLISH' : 'BEARISH';
            const drift = reg === 'BULLISH' ? 0.06 : -0.06;
            p = Math.max(10, p + drift + (Math.random() - 0.5) * 1.2);
            initialTicks.push({
                time: Date.now() - (MAX_POINTS - i) * TICK_INTERVAL_MS,
                price: p,
                regime: reg,
                volume: Math.floor(Math.random() * 80 + 20),
            });
        }
        priceRef.current = p;
        setTicks(initialTicks);
    }, []);

    // Tick generator
    useEffect(() => {
        if (!isSimulating) return;

        let tickCount = 0;

        const interval = setInterval(() => {
            tickCount++;
            const currentPrice = priceRef.current;

            if (tickCount % 15 === 0) {
                const newRegime = Math.random() > 0.42 ? 'BULLISH' : 'BEARISH';
                regimeRef.current = newRegime;
                setRegime(newRegime);
            }

            const drift = regimeRef.current === 'BULLISH' ? 0.06 : regimeRef.current === 'BEARISH' ? -0.06 : 0;
            const volatility = 0.9;
            const change = drift + (Math.random() - 0.5) * volatility;
            priceRef.current = Math.max(10, currentPrice + change);

            let tradeType: 'BUY' | 'SELL' | undefined = undefined;

            if (regimeRef.current === 'BULLISH' && positionRef.current !== 'LONG' && Math.random() > 0.75) {
                if (positionRef.current === 'SHORT') {
                    equityRef.current += (entryPriceRef.current - priceRef.current) * 100;
                }
                tradeType = 'BUY';
                positionRef.current = 'LONG';
                entryPriceRef.current = priceRef.current;
            } else if (regimeRef.current === 'BEARISH' && positionRef.current !== 'SHORT' && Math.random() > 0.75) {
                if (positionRef.current === 'LONG') {
                    equityRef.current += (priceRef.current - entryPriceRef.current) * 100;
                }
                tradeType = 'SELL';
                positionRef.current = 'SHORT';
                entryPriceRef.current = priceRef.current;
            }

            setEquity(equityRef.current);
            setTicks(prev => {
                const next = [...prev, {
                    time: Date.now(),
                    price: priceRef.current,
                    type: tradeType,
                    regime: regimeRef.current,
                    volume: Math.floor(Math.random() * 80 + 20),
                }];
                if (next.length > MAX_POINTS) next.shift();
                return next;
            });
        }, TICK_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [isSimulating]);

    const { pathDef, areaPath, points, minPrice, maxPrice, maxVol } = useMemo(() => {
        if (ticks.length === 0) return { pathDef: '', areaPath: '', points: [], minPrice: 0, maxPrice: 0, maxVol: 0 };

        let min = Infinity, max = -Infinity, mv = 0;
        ticks.forEach(t => {
            if (t.price < min) min = t.price;
            if (t.price > max) max = t.price;
            if (t.volume > mv) mv = t.volume;
        });

        const padding = (max - min) * 0.15;
        const minP = min - padding;
        const maxP = max + padding;
        const range = maxP - minP || 1;

        const W = 1000, H = 320;

        const mapped = ticks.map((t, i) => ({
            x: (i / (MAX_POINTS - 1)) * W,
            y: H - ((t.price - minP) / range) * H,
            tick: t,
        }));

        const d = smoothPath(mapped);
        const lastPt = mapped[mapped.length - 1];
        const areaDef = d + ` L ${lastPt.x} ${H} L 0 ${H} Z`;

        return { pathDef: d, areaPath: areaDef, points: mapped, minPrice: minP, maxPrice: maxP, maxVol: mv };
    }, [ticks]);

    const pnlPercent = ((equity - 100000) / 100000) * 100;
    const pnlPositive = pnlPercent >= 0;
    const lastTick = ticks[ticks.length - 1];
    const currentPrice = lastTick?.price ?? priceRef.current;

    // Grid lines
    const gridLines = [0, 0.25, 0.5, 0.75, 1];

    return (
        <div className="relative w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d1117] shadow-2xl mt-8 group">
            {/* Subtle top gradient accent */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-0 z-10 relative">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <BarChart2 className="h-3.5 w-3.5 text-white/30" />
                        <span className="text-[11px] font-medium uppercase tracking-widest text-white/30">Algorithmic Engine</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-white/90 tracking-tight">
                        ₹{currentPrice.toFixed(2)}
                        <span className={`ml-3 text-sm font-medium ${pnlPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pnlPositive ? '▲' : '▼'} {Math.abs(pnlPercent).toFixed(2)}%
                        </span>
                    </h3>
                </div>

                <div className="flex items-center gap-5">
                    {/* Regime pill */}
                    <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider border
                        ${regime === 'BULLISH'
                            ? 'bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/[0.08] border-red-500/20 text-red-400'}`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${regime === 'BULLISH' ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
                        {regime}
                    </div>

                    {/* Equity */}
                    <div className="text-right">
                        <p className="text-[10px] text-white/30 mb-0.5">Simulated Equity</p>
                        <span className="text-base font-mono font-semibold text-white/80">
                            ₹{equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                    </div>

                    {/* Play/Pause */}
                    <button
                        onClick={() => setIsSimulating(!isSimulating)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-white/40 hover:text-white/70 transition-all"
                    >
                        {isSimulating
                            ? <Pause className="h-3.5 w-3.5" />
                            : <Play className="h-3.5 w-3.5 ml-0.5" />
                        }
                    </button>
                </div>
            </div>

            {/* Chart */}
            <div className="relative mt-3 px-1 pb-0" style={{ height: '260px' }}>
                {/* Y-axis labels */}
                <div className="absolute right-3 inset-y-0 flex flex-col justify-between text-[9px] font-mono text-white/20 pointer-events-none z-10 py-1">
                    {[...gridLines].reverse().map((g, i) => (
                        <span key={i}>{(minPrice + (maxPrice - minPrice) * g).toFixed(2)}</span>
                    ))}
                </div>

                <svg
                    viewBox="0 0 1000 320"
                    className="absolute inset-0 h-full w-full"
                    preserveAspectRatio="none"
                >
                    <defs>
                        {/* Main area gradient */}
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={pnlPositive ? '#10b981' : '#ef4444'} stopOpacity="0.18" />
                            <stop offset="70%" stopColor={pnlPositive ? '#10b981' : '#ef4444'} stopOpacity="0.04" />
                            <stop offset="100%" stopColor={pnlPositive ? '#10b981' : '#ef4444'} stopOpacity="0" />
                        </linearGradient>
                        {/* Glow filter for line */}
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2.5" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        <clipPath id="chartClip">
                            <rect x="0" y="0" width="1000" height="320" />
                        </clipPath>
                    </defs>

                    {/* Grid lines */}
                    {gridLines.map((g, i) => (
                        <line
                            key={i}
                            x1="0" y1={320 - g * 320}
                            x2="1000" y2={320 - g * 320}
                            stroke="rgba(255,255,255,0.035)"
                            strokeWidth="1"
                        />
                    ))}

                    <g clipPath="url(#chartClip)">
                        {/* Volume bars */}
                        {points.map((p, i) => {
                            const barH = maxVol > 0 ? (p.tick.volume / maxVol) * 55 : 0;
                            const isBull = p.tick.regime === 'BULLISH';
                            return (
                                <rect
                                    key={`vol-${i}`}
                                    x={p.x - 4}
                                    y={320 - barH}
                                    width={8}
                                    height={barH}
                                    fill={isBull ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}
                                    rx="1"
                                />
                            );
                        })}

                        {/* Area fill */}
                        {areaPath && (
                            <path d={areaPath} fill="url(#areaGrad)" />
                        )}

                        {/* Price line */}
                        {pathDef && (
                            <path
                                d={pathDef}
                                fill="none"
                                stroke={pnlPositive ? '#10b981' : '#ef4444'}
                                strokeWidth="1.8"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                                filter="url(#glow)"
                            />
                        )}

                        {/* Trade markers — only BUY/SELL dots, no pinging ring to keep it clean */}
                        {points.map((p, i) => {
                            if (!p.tick.type) return null;
                            const isBuy = p.tick.type === 'BUY';
                            return (
                                <g key={`trade-${i}`} transform={`translate(${p.x}, ${p.y})`}>
                                    <circle r="4" fill={isBuy ? '#10b981' : '#ef4444'} opacity="0.9" />
                                    <circle r="7" fill={isBuy ? '#10b981' : '#ef4444'} opacity="0.15" />
                                </g>
                            );
                        })}

                        {/* Live dot at end */}
                        {points.length > 0 && isSimulating && (
                            <g transform={`translate(${points[points.length - 1].x}, ${points[points.length - 1].y})`}>
                                <circle r="3" fill={pnlPositive ? '#10b981' : '#ef4444'} />
                                <circle r="6" fill={pnlPositive ? '#10b981' : '#ef4444'} opacity="0.15" />
                            </g>
                        )}
                    </g>
                </svg>
            </div>

            {/* Bottom bar: time labels + stats */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.04] mt-1">
                <div className="flex gap-6 text-[10px] text-white/25 font-mono">
                    {['−80', '−60', '−40', '−20', 'Now'].map((t, i) => (
                        <span key={i}>{t}</span>
                    ))}
                </div>
                <div className="flex items-center gap-5 text-[10px] text-white/30">
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500/60" />
                        Buy signal
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-red-500/60" />
                        Sell signal
                    </span>
                    <span className="text-white/20">|</span>
                    <span>Ticks: {ticks.length}</span>
                </div>
            </div>
        </div>
    );
}
