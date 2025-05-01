// src/components/FiboWaveScenario.tsx
// -----------------------------------------------------------------------------
// Fibonacci & Elliott overview card
// Works with recharts v2.15.x  |  © StockScout 2025
// -----------------------------------------------------------------------------

import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    AlertCircle,
    RefreshCw,
    Info,
} from "lucide-react";
import {
    ResponsiveContainer,
    ComposedChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Line,
    Scatter,
    ReferenceLine,
    Tooltip,
    BarChart,
    Bar,
} from "recharts";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover";

// -----------------------------------------------------------------------------
// Backend DTOs ---------------------------------------------------------------
// -----------------------------------------------------------------------------
type Candle = {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number | null;
};
type Pivot = { index: number; date: string; price: number; kind: "high" | "low" };
type WaveLabel = { pivot_index: number; pivot_price: number; wave_label: string; wave_degree: string };
type FiboRetracement = { wave: string; range: [number, number]; fib_levels: Record<number, boolean> };
type WaveMetric = { wave_label: string; start_date: string; end_date: string; mae: number; mfe: number };

type AnalysisResponse = {
    candles: Candle[];
    pivots: Pivot[];
    waves: WaveLabel[];
    fibo: FiboRetracement[];
    risk: WaveMetric[];
    kelly_fraction: number;
};

// -----------------------------------------------------------------------------
// Helpers --------------------------------------------------------------------
// -----------------------------------------------------------------------------
const formatTick = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
};

// custom SVG for wave labels
const WaveLabelShape = ({ cx, cy, payload }: any): React.ReactElement => {
    /* payload is the entire data object for that x-position */
    const waves: WaveLabel[] = payload.waves ?? [];
    return (
        <g>
            {waves.map((w, i) => (
                <text
                    key={i}
                    x={cx}
                    y={cy - 12 - i * 14}
                    fontSize={10}
                    textAnchor="middle"
                    fontWeight={600}
                    fill="#374151"
                >
                    {w.wave_label}
                </text>
            ))}
        </g>
    );
};

// -----------------------------------------------------------------------------
// Component -------------------------------------------------------------------
// -----------------------------------------------------------------------------
interface Props {
    pctThreshold?: number; // zig-zag % (backend default = 0.03)
}

export const FiboWaveScenario: React.FC<Props> = ({
    pctThreshold = 0.03,
}) => {
    const { ticker } = useParams<{ ticker: string }>();
    const queryClient = useQueryClient();

    // --------------------- fetch ------------------------------------------------
    const { data, error, isLoading } = useQuery<AnalysisResponse, Error>({
        queryKey: ["fibo-analysis", ticker, pctThreshold],
        enabled: !!ticker,
        retry: false,
        queryFn: () =>
            apiClient
                .get<AnalysisResponse>(
                    `/fibo-waves/analyze/${ticker}?pct=${pctThreshold}`
                )
                .then((r) => r.data),
    });

    // ------------------ massage for recharts -----------------------------------
    const chartData = useMemo(() => {
        if (!data) return [];
        // index -> wave labels
        const waveMap = new Map<number, WaveLabel[]>();
        data.waves.forEach((w) => {
            const arr = waveMap.get(w.pivot_index) ?? [];
            arr.push(w);
            waveMap.set(w.pivot_index, arr);
        });

        return data.candles.map((c, idx) => {
            const pivot = data.pivots.find((p) => p.index === idx) ?? null;
            return {
                ...c,
                timestamp: new Date(c.date).getTime(), // numeric axis key
                pivotPrice: pivot?.price ?? null,
                pivot,
                waves: waveMap.get(idx) ?? [],
            };
        });
    }, [data]);

    // --------------------- render states ---------------------------------------
    if (isLoading)
        return (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
            </div>
        );
    if (error)
        return (
            <div className="flex items-center justify-center p-8 text-destructive">
                <AlertCircle className="w-5 h-5 mr-2" /> {error.message}
            </div>
        );
    if (!data) return null;

    const refresh = () =>
        queryClient.invalidateQueries({
            queryKey: ["fibo-analysis", ticker, pctThreshold],
        });

    // --------------------- main view -------------------------------------------
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
                <CardHeader className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <CardTitle>Fib/Elliott – {ticker}</CardTitle>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                            </PopoverTrigger>
                            <PopoverContent className="w-80 text-sm">
                                <p className="font-semibold mb-2">Chart guide</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>
                                        <b className="font-medium">Blue dots</b>: zig-zag pivots
                                    </li>
                                    <li>
                                        <b className="font-medium">Numbers / letters</b>: wave
                                        labels (1-5, A-C)
                                    </li>
                                    <li>
                                        <b className="font-medium">Dashed lines</b>: Fibonacci
                                        retracements (teal = respected)
                                    </li>
                                    <li>
                                        <b className="font-medium">Kelly fraction</b>: optimal %
                                        equity risk next wave (55 % edge)
                                    </li>
                                </ul>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button variant="ghost" size="icon" onClick={refresh}>
                        <RefreshCw className="w-5 h-5" />
                    </Button>
                </CardHeader>

                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Suggested Kelly fraction:&nbsp;
                        <span className="font-semibold text-foreground">
                            {Math.round(data.kelly_fraction * 100)}%
                        </span>
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                        Kelly = p − (1 − p)/R, with p = 55 % win-prob and R = MFE ÷ MAE.
                    </p>

                    {/* price pane ------------------------------------------------------ */}
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={chartData}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                                <XAxis
                                    dataKey="timestamp"
                                    type="number"
                                    domain={["dataMin", "dataMax"]}
                                    scale="time"
                                    tickFormatter={formatTick}
                                    minTickGap={20}
                                />
                                <YAxis domain={["auto", "auto"]} />

                                {/* close line placeholder (swap for candlesticks later) */}
                                <Line
                                    type="monotone"
                                    dataKey="close"
                                    strokeWidth={1}
                                    dot={false}
                                />

                                {/* pivot dots */}
                                <Scatter
                                    name="Pivots"
                                    data={chartData}
                                    dataKey="pivotPrice"
                                    shape="circle"
                                    fill="#3b82f6"
                                    isAnimationActive={false}
                                />

                                {/* wave labels */}
                                <Scatter
                                    name="Labels"
                                    data={chartData.filter((d) => d.waves.length)}
                                    dataKey="pivotPrice"
                                    shape={(props) => <WaveLabelShape {...props} />}
                                    fill="transparent"
                                    isAnimationActive={false}
                                />

                                {/* fibonacci of last impulse */}
                                {(() => {
                                    if (!data.fibo.length) return null;
                                    const last = data.fibo[data.fibo.length - 1];
                                    const lo = data.candles[last.range[0]].close;
                                    const hi = data.candles[last.range[1]].close;
                                    return Object.entries(last.fib_levels).map(
                                        ([pctStr, hit]) => {
                                            const pct = parseFloat(pctStr);
                                            const y = hi - (hi - lo) * pct;
                                            return (
                                                <ReferenceLine
                                                    key={pctStr}
                                                    y={y}
                                                    stroke={hit ? "#14b8a6" : "#94a3b8"}
                                                    strokeDasharray="3 3"
                                                    label={{
                                                        value: `${(pct * 100).toFixed(1)}%`,
                                                        fontSize: 10,
                                                        fill: hit ? "#14b8a6" : "#94a3b8",
                                                    }}
                                                />
                                            );
                                        }
                                    );
                                })()}

                                <Tooltip
                                    formatter={(val, name, { payload }) => {
                                        if (name === "pivotPrice" && payload.pivot) {
                                            return [
                                                payload.pivot.price.toFixed(2),
                                                `${payload.pivot.kind.toUpperCase()} pivot`,
                                            ];
                                        }
                                        return [val, name];
                                    }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    {/* volume pane ------------------------------------------------------ */}
                    <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <XAxis
                                    dataKey="timestamp"
                                    type="number"
                                    domain={["dataMin", "dataMax"]}
                                    scale="time"
                                    hide
                                />
                                <YAxis hide domain={[0, "auto"]} />
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.05} />
                                <Bar
                                    dataKey={(d) => d.volume ?? 0}
                                    maxBarSize={4}
                                    fill="#cbd5e1"
                                    isAnimationActive={false}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};
