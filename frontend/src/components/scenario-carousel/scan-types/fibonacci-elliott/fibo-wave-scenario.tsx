import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import {
    ResponsiveContainer,
    ComposedChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Scatter,
    ReferenceLine,
} from "recharts";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/services/apiClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";

////////////////////////////////////////////////////////////////////////////////
// API response types — must mirror backend AnalysisResponse
////////////////////////////////////////////////////////////////////////////////

type Candle = {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number | null;
};

type Pivot = {
    index: number;
    date: string;
    price: number;
    kind: "high" | "low";
};

type WaveLabel = {
    pivot_index: number;
    pivot_price: number;
    wave_label: string;
    wave_degree: string;
};

type FiboRetracement = {
    wave: string;
    range: [number, number];
    fib_levels: Record<number, boolean>;
};

type WaveMetric = {
    wave_label: string;
    start_date: string;
    end_date: string;
    mae: number;
    mfe: number;
};

type AnalysisResponse = {
    candles: Candle[];
    pivots: Pivot[];
    waves: WaveLabel[];
    fibo: FiboRetracement[];
    risk: WaveMetric[];
    kelly_fraction: number;
};

////////////////////////////////////////////////////////////////////////////////
// Helpers
////////////////////////////////////////////////////////////////////////////////

function formatDateTick(iso: string) {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

////////////////////////////////////////////////////////////////////////////////
// Component
////////////////////////////////////////////////////////////////////////////////

export const FiboWaveScenario: React.FC<{ pctThreshold?: number }> = ({ pctThreshold = 0.01 }) => {
    const { ticker } = useParams<{ ticker: string }>();
    const queryClient = useQueryClient();

    ////////////////////////////////////////////////////////////////////////////
    // Data fetching (token automatically passed by apiClient)
    ////////////////////////////////////////////////////////////////////////////

    const {
        data: analysis,
        isLoading,
        error,
    } = useQuery<AnalysisResponse, Error>({
        queryKey: ["fibo-analysis", ticker, pctThreshold],
        queryFn: () =>
            apiClient
                .get<AnalysisResponse>(`/fibo-waves/analyze/${ticker}?pct=${pctThreshold}`)
                .then((r) => r.data),
        enabled: !!ticker,
        retry: false,
    });

    ////////////////////////////////////////////////////////////////////////////
    // Transform for Recharts
    ////////////////////////////////////////////////////////////////////////////

    const chartData = useMemo(() => {
        if (!analysis) return [];

        const wavesByIdx = new Map<number, WaveLabel[]>();
        analysis.waves.forEach((w) => {
            const arr = wavesByIdx.get(w.pivot_index) ?? [];
            arr.push(w);
            wavesByIdx.set(w.pivot_index, arr);
        });

        return analysis.candles.map((c, i) => ({
            ...c,
            pivot: analysis.pivots.find((p) => p.index === i) ?? null,
            waves: wavesByIdx.get(i) ?? [],
        }));
    }, [analysis]);

    ////////////////////////////////////////////////////////////////////////////
    // Render
    ////////////////////////////////////////////////////////////////////////////

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center p-8 text-destructive">
                <AlertCircle className="h-5 w-5 mr-2" /> {error.message}
            </div>
        );
    }

    if (!analysis) return null;

    const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ["fibo-analysis", ticker, pctThreshold] });

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
        >
            <Card>
                <CardHeader className="flex justify-between items-center">
                    <CardTitle>Fibonacci & Elliott – {ticker}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={handleRefresh} aria-label="Refresh">
                        <RefreshCw className="h-5 w-5" />
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* Kelly fraction badge */}
                    <p className="text-sm text-muted-foreground mb-2">
                        Suggested Kelly fraction: <span className="font-semibold text-foreground">{Math.round(analysis.kelly_fraction * 100)}%</span>
                    </p>

                    {/* Chart */}
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                                <XAxis dataKey="date" tickFormatter={formatDateTick} minTickGap={20} />
                                <YAxis domain={["auto", "auto"]} />

                                {/* Close line until candlesticks are implemented */}
                                <Line type="monotone" dataKey="close" strokeWidth={1} dot={false} />

                                {/* Pivots */}
                                <Scatter dataKey="pivot.price" shape="circle" fill="#8884d8" isAnimationActive={false} />

                                {/* Fibonacci reference lines (only latest impulse for now) */}
                                {analysis.fibo.length > 0 &&
                                    Object.entries(analysis.fibo[analysis.fibo.length - 1].fib_levels).map(([pct, hit]) => (
                                        <ReferenceLine
                                            key={pct}
                                            yAxisId={0}
                                            y={
                                                (() => {
                                                    const fibPct = parseFloat(pct);
                                                    const { range } = analysis.fibo[analysis.fibo.length - 1];
                                                    const lo = analysis.candles[range[0]].close;
                                                    const hi = analysis.candles[range[1]].close;
                                                    return hi - (hi - lo) * fibPct;
                                                })()
                                            }
                                            stroke={hit ? "#00bcd4" : "#bbb"}
                                            strokeDasharray="3 3"
                                            label={`${(parseFloat(pct) * 100).toFixed(1)}%`}
                                        />
                                    ))}

                                <Tooltip
                                    formatter={(val: any, name: string, props: any) => {
                                        if (name === "pivot.price" && props.payload.pivot) {
                                            const p: Pivot = props.payload.pivot;
                                            return [p.price.toFixed(2), p.kind.toUpperCase() + " pivot"];
                                        }
                                        return [val, name];
                                    }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};