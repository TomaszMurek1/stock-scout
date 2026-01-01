import React, { useMemo } from "react";
import {
    ResponsiveContainer,
    ComposedChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Line,
    Bar,
    Scatter,
    ReferenceLine,
} from "recharts";



import { WaveShape } from "./WaveShape";
import { ChartRow, Fibo, Pivot, Wave } from "./fiboWaves.types";
import { safeParseDate } from "@/utils/dates";
import { monthAbbr } from "@/utils/constans";

interface ChartProps {
    data: {
        candles: { date: string; close: number; volume: number | null }[];
        pivots: Pivot[];
        waves: Wave[];
        fibo: Fibo[];
        kelly_fraction: number;
    };
}

/**
 * Main chart rendering component.
 * Processes raw API data into Recharts rows and renders price line,
 * volume bars, pivot scatter, wave labels, and fibo levels.
 */
export const FiboWaveChartArea: React.FC<ChartProps> = ({ data }) => {
    // 1) Build gapless rows + month tick indices
    const { rows, monthStartIndices } = useMemo(() => {
        if (!data?.candles) return { rows: [] as ChartRow[], monthStartIndices: [] as number[] };
        // Map waves by original index for quick lookup
        const waveMap = new Map<number, Wave[]>();
        data.waves.forEach(w => {
            if (w.wave_label === "?") return;
            if (!waveMap.has(w.pivot_index)) waveMap.set(w.pivot_index, []);
            waveMap.get(w.pivot_index)!.push(w);
        });

        const processed: ChartRow[] = [];
        const ticks: number[] = [];
        let lastMonth = -1;

        data.candles.forEach((candle, i) => {
            const dateObj = safeParseDate(candle.date);
            if (!dateObj) {
                console.error(`Invalid date at index ${i}: ${candle.date}`);
                return;
            }

            const pivot = data.pivots.find(p => p.index === i) || null;
            const idx = processed.length;
            processed.push({
                index: idx,
                date: candle.date,
                timestamp: dateObj.getTime(),
                close: candle.close,
                vol: candle.volume ?? 0,
                pivotPrice: pivot?.price,
                pivot,
                waves: waveMap.get(i) || [],
            });

            const m = dateObj.getUTCMonth();
            if (m !== lastMonth) {
                ticks.push(idx);
                lastMonth = m;
            }
        });

        return { rows: processed, monthStartIndices: ticks };
    }, [data]);

    // 2) Filtered arrays for scatter plots
    const pivotRows = useMemo(() => rows.filter(r => r.pivot !== null), [rows]);
    const waveRows = useMemo(() => rows.filter(r => r.waves.length > 0), [rows]);

    // 3) Compute Fibonacci reference lines
    const fibLines = useMemo(() => {
        if (!data.fibo.length || !rows.length) return null;
        const last = data.fibo[data.fibo.length - 1];
        const [startI, endI] = last.range;
        const startDate = data.candles[startI]?.date;
        const endDate = data.candles[endI]?.date;
        const r0 = rows.find(r => r.date === startDate);
        const r1 = rows.find(r => r.date === endDate);
        if (!r0 || !r1) return null;

        const low = Math.min(r0.close, r1.close);
        const high = Math.max(r0.close, r1.close);
        const span = high - low;
        if (span <= 0) return null;

        return Object.entries(last.fib_levels).map(([pct, hit]) => {
            const p = parseFloat(pct);
            if (isNaN(p)) return null;
            const y = low + span * p;
            const color = hit ? "#14b8a6" : "#94a3b8";
            return (
                <ReferenceLine
                    key={pct}
                    yAxisId="price"
                    y={y}
                    stroke={color}
                    strokeDasharray="3 3"
                    label={{ value: `${(p * 100).toFixed(1)}%`, position: 'right', fontSize: 10, fill: color }}
                />
            );
        });
    }, [data.fibo, rows, data.candles]);

    // 4) Compute global min/max for YAxis domain to prevent clipping
    const yDomain = useMemo(() => {
        if (!data.candles.length) return ['auto', 'auto'];
        
        let min = Infinity;
        let max = -Infinity;
        
        // Check all close prices
        data.candles.forEach(c => {
            if (c.close < min) min = c.close;
            if (c.close > max) max = c.close;
        });

        // Optional: check pivots as well to ensure they are visible
        data.pivots.forEach(p => {
             if (p.price < min) min = p.price;
             if (p.price > max) max = p.price;
        });
        
        if (min === Infinity || max === -Infinity) return ['auto', 'auto'];
        
        const padding = (max - min) * 0.05;
        // If flat line, add arbitrary padding
        if (padding === 0) return [min * 0.95, max * 1.05];

        return [min - padding, max + padding];
    }, [data.candles, data.pivots]);

    // 5) Axis & tooltip formatters
    const formatXAxis = (i: number) =>
        monthAbbr[new Date(rows[i]?.timestamp).getUTCMonth()] || "";
    const formatTooltipLabel = (i: number) =>
        new Date(rows[i]?.timestamp).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
        });
    const formatTooltipValue = (val: any, name: string, props: any) => {
        const p = props.payload as ChartRow;
        if (name === "pivotPrice" && p.pivot) {
            return [`${p.pivot.price.toFixed(2)}`, `${p.pivot.kind} pivot`];
        }
        if (name === "vol") {
            const n = Number(val);
            if (n >= 1e6) return [`${(n / 1e6).toFixed(1)}M`, "Volume"];
            if (n >= 1e3) return [`${(n / 1e3).toFixed(0)}k`, "Volume"];
            return [n, "Volume"];
        }
        if (name === "close") {
            return [Number(val).toFixed(2), "Close"];
        }
        return [val, name];
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 10, right: 35, left: 25, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis
                    dataKey="index" type="number" domain={['dataMin', 'dataMax']}
                    ticks={monthStartIndices} tickFormatter={formatXAxis}
                    interval={0} minTickGap={40}
                    axisLine={{ strokeOpacity: 0.5 }} tickLine={{ strokeOpacity: 0.5 }}
                    tick={{ fontSize: 11 }} padding={{ left: 15, right: 15 }}
                />
                <YAxis
                    yAxisId="price" orientation="left"
                    domain={yDomain}
                    tickFormatter={p => typeof p === 'number' ? p.toFixed(2) : ''}
                    width={60} tick={{ fontSize: 11 }}
                    allowDataOverflow={false}
                />
                <YAxis yAxisId="vol" orientation="right" domain={[0, 'auto']} hide />
                <Tooltip
                    labelFormatter={formatTooltipLabel}
                    formatter={formatTooltipValue}
                    contentStyle={{
                        background: 'rgba(255,255,255,0.9)', border: '1px solid #ccc',
                        borderRadius: '4px', fontSize: '12px', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)'
                    }}
                    cursor={{ stroke: '#888', strokeWidth: 0.5 }}
                />
                <Line yAxisId="price" dataKey="close" name="Close"
                    stroke="#6366f1" strokeWidth={1.5} dot={false} isAnimationActive={false}
                />
                <Bar yAxisId="vol" dataKey="vol" name="Volume"
                    barSize={3} opacity={0.4} fill="#a1a1aa" isAnimationActive={false}
                />
                <Scatter
                    yAxisId="price" data={pivotRows} dataKey="pivotPrice" name="Pivot"
                    fill="#3b82f6" isAnimationActive={false}
                />
                <Scatter
                    yAxisId="price" data={waveRows} dataKey="pivotPrice"
                    shape={(props: any) => <WaveShape {...props} />}
                    isAnimationActive={false}
                />
                {fibLines}
            </ComposedChart>
        </ResponsiveContainer>
    );
};
