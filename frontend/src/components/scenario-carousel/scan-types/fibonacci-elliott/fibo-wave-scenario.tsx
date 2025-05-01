import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
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
    // Import specific types if needed for custom shapes or tooltips
} from "recharts";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card"; // Assuming shadcn/ui
import { Button } from "@/components/ui/button"; // Assuming shadcn/ui
import {
    Loader2,
    AlertCircle,
    RefreshCw,
    Info,
} from "lucide-react";
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover"; // Assuming shadcn/ui
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient"; // Your API client instance

// -----------------------------------------------------------------------------
// API DTOs (Define according to your actual API response)
// -----------------------------------------------------------------------------
type Candle = { date: string; close: number; volume: number | null };
type Pivot = { index: number; price: number; kind: "high" | "low" };
type Wave = { pivot_index: number; pivot_price: number; wave_label: string };
type Fibo = { range: [number, number]; fib_levels: Record<number, boolean> };

interface ApiResp {
    candles: Candle[];
    pivots: Pivot[];
    waves: Wave[];
    fibo: Fibo[];
    kelly_fraction: number;
}

// -----------------------------------------------------------------------------
// Chart Data Row Type
// -----------------------------------------------------------------------------
type ChartRow = {
    index: number; // Sequential index for gapless X-axis
    date: string; // Original date string
    timestamp: number; // Millisecond timestamp for easy date formatting
    close: number;
    vol: number;
    pivotPrice?: number; // Pivot price (optional)
    pivot: Pivot | null; // Full pivot data (null if not a pivot point)
    waves: Wave[]; // Associated wave labels for this point
};

// -----------------------------------------------------------------------------
// Helper Constants and Functions
// -----------------------------------------------------------------------------
const monthAbbr = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Safely parses a date string (YYYY-MM-DD or ISO format expected).
 * Treats dates as UTC to avoid timezone inconsistencies.
 * @param dateString - The date string to parse.
 * @returns A Date object (in UTC) or null if parsing fails.
 */
const safeParseDate = (dateString: string): Date | null => {
    if (!/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
        console.warn(`Invalid date format encountered: ${dateString}`);
        return null;
    }
    const parts = dateString.substring(0, 10).split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10); // 1-based month
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
        console.warn(`Failed to parse date components: ${dateString}`);
        return null;
    }
    // Use Date.UTC which expects a 0-based month
    const utcTimestamp = Date.UTC(year, month - 1, day);
    const date = new Date(utcTimestamp);
    if (isNaN(date.getTime())) {
        console.warn(`Constructed invalid date: ${dateString}`);
        return null;
    }
    return date;
};


// -----------------------------------------------------------------------------
// Custom Shape for Wave Labels
// -----------------------------------------------------------------------------
interface WaveShapeProps {
    cx?: number; // X coordinate from Recharts
    cy?: number; // Y coordinate from Recharts
    payload?: ChartRow; // The data associated with this point
}

const WaveShape = ({ cx, cy, payload }: WaveShapeProps): React.ReactElement | null => {
    if (cx === undefined || cy === undefined || !payload?.waves?.length) {
        return null;
    }
    return (
        <g>
            {payload.waves.map((w, i) => (
                <text
                    key={i}
                    x={cx}
                    y={cy - 12 - (i * 14)} // Position labels vertically above the point
                    fontSize={10}
                    fontWeight={600}
                    textAnchor="middle"
                    fill="#374151" // Example color
                    style={{ pointerEvents: 'none' }} // Prevent text from interfering
                >
                    {w.wave_label}
                </text>
            ))}
        </g>
    );
};


// -----------------------------------------------------------------------------
// Main Chart Component
// -----------------------------------------------------------------------------
export const FiboWaveScenario: React.FC = () => {
    const { ticker } = useParams<{ ticker: string }>();
    const qc = useQueryClient();

    // -------------------------------------------------------------------------
    // Data Fetching using TanStack Query
    // -------------------------------------------------------------------------
    const { data, error, isLoading, isError } = useQuery<ApiResp, Error>({
        enabled: !!ticker,
        retry: 1,
        queryKey: ["elliott", ticker],
        queryFn: () =>
            apiClient.get<ApiResp>(`/fibo-waves/analyze/${ticker}`).then(r => r.data),
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
    });

    // -------------------------------------------------------------------------
    // Data Processing and Memoization
    // -------------------------------------------------------------------------

    // Process rows AND calculate indices for month starts
    const { rows, monthStartIndices } = useMemo(() => {
        // Return empty structure if no data
        if (!data?.candles) return { rows: [], monthStartIndices: [] };

        // Pre-map waves by their original API index for efficient lookup
        const waveMap = new Map<number, Wave[]>();
        data.waves?.forEach(w => {
            if (w.wave_label === "?") return; // Skip placeholders if needed
            if (!waveMap.has(w.pivot_index)) waveMap.set(w.pivot_index, []);
            waveMap.get(w.pivot_index)!.push(w);
        });

        const processedRows: ChartRow[] = [];
        const tickIndices: number[] = []; // Stores the index of the first data point of each month
        let lastMonth = -1; // Track the last seen month (0-11)

        // Iterate through the original candle data
        for (let i = 0; i < data.candles.length; i++) {
            const candle = data.candles[i];
            const pivotData = data.pivots?.find(p => p.index === i) ?? null; // Find pivot by original index
            const dateObj = safeParseDate(candle.date); // Parse date (handles potential errors)

            // Skip this data point entirely if the date is invalid
            if (!dateObj) {
                console.error(`Skipping candle index ${i} due to invalid date: ${candle.date}`);
                continue;
            }

            // Determine the sequential index for the current row being added
            const currentRowIndex = processedRows.length;

            // Add the processed row to our array
            processedRows.push({
                index: currentRowIndex, // Use sequential index
                date: candle.date,
                timestamp: dateObj.getTime(),
                close: candle.close,
                vol: candle.volume ?? 0,
                pivotPrice: pivotData?.price,
                pivot: pivotData,
                waves: waveMap.get(i) ?? [], // Get waves using original API index 'i'
            });

            // Check if the month has changed compared to the last row added
            const currentMonth = dateObj.getUTCMonth(); // Use UTC month
            if (currentMonth !== lastMonth) {
                tickIndices.push(currentRowIndex); // Store the index of this row (first of the new month)
                lastMonth = currentMonth; // Update the last seen month
            }
        }
        // Return both the processed data rows and the calculated tick indices
        return { rows: processedRows, monthStartIndices: tickIndices };
    }, [data]); // Recalculate only when API data changes

    // Memoize filtered data specifically for Scatter plots
    const pivotRows = useMemo(() => rows.filter(r => r.pivot !== null), [rows]);
    const waveRows = useMemo(() => rows.filter(r => r.waves.length > 0), [rows]);

    // Memoize Fibonacci ReferenceLines calculation
    const fibLines = useMemo(() => {
        if (!data?.fibo?.length || !data.candles?.length || !rows.length) return null;
        const lastFiboSet = data.fibo[data.fibo.length - 1];
        if (!lastFiboSet) return null;
        const [apiStartIndex, apiEndIndex] = lastFiboSet.range;

        // Find processed rows corresponding to the original API candle dates
        const startCandleDate = data.candles[apiStartIndex]?.date;
        const endCandleDate = data.candles[apiEndIndex]?.date;
        const startRow = startCandleDate ? rows.find(r => r.date === startCandleDate) : undefined;
        const endRow = endCandleDate ? rows.find(r => r.date === endCandleDate) : undefined;

        if (!startRow || !endRow || typeof startRow.close !== 'number' || typeof endRow.close !== 'number') {
            console.error("Fibonacci range invalid or corresponding rows not found/valid.", { apiStartIndex, apiEndIndex, startCandleDate, endCandleDate });
            return null;
        }
        const lowPrice = Math.min(startRow.close, endRow.close);
        const highPrice = Math.max(startRow.close, endRow.close);
        const priceRange = highPrice - lowPrice;
        if (priceRange <= 0) return null;

        return Object.entries(lastFiboSet.fib_levels).map(([pctStr, hit]) => {
            const percentage = parseFloat(pctStr);
            if (isNaN(percentage)) return null;
            const yLevel = lowPrice + (priceRange * percentage);
            const color = hit ? "#14b8a6" : "#94a3b8";
            return (
                <ReferenceLine
                    key={pctStr}
                    yAxisId="price"
                    y={yLevel}
                    stroke={color}
                    strokeDasharray="3 3"
                    label={{
                        value: `${(percentage * 100).toFixed(1)}%`,
                        position: 'right',
                        fontSize: 10,
                        fill: color,
                    }}
                />
            );
        });
    }, [data, rows]);

    // -------------------------------------------------------------------------
    // Helper Functions for Chart Formatting (Context-dependent)
    // -------------------------------------------------------------------------
    console.log("FiboWaveScenario - Data:", { rows, pivotRows, waveRows, fibLines });
    // Formats the X-axis tick label (receives index, returns month abbr.)
    const formatXAxisTick = (index: number): string => {
        if (index >= 0 && index < rows.length && Number.isInteger(index)) {
            const row = rows[index];
            if (row) {
                const date = new Date(row.timestamp);
                return monthAbbr[date.getUTCMonth()]; // Use UTC month consistent with calculation
            }
        }
        return '';
    };

    // Formats the tooltip label (receives index, returns full date)
    const formatTooltipLabel = (index: number): string => {
        if (index >= 0 && index < rows.length && Number.isInteger(index)) {
            const row = rows[index];
            if (row) {
                const date = new Date(row.timestamp);
                return date.toLocaleDateString(undefined, { // Use browser locale
                    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' // Specify UTC
                });
            }
        }
        return `Index: ${index}`; // Fallback
    };

    // Formats values within the tooltip (receives value, name, props)
    const formatTooltipValue = (value: number | string, name: string, props: any): [string, string] | [number, string] => {
        const payload = props.payload as ChartRow | undefined;
        if (name === "pivotPrice" && payload?.pivot) {
            return [payload.pivot.price.toFixed(2), `${payload.pivot.kind} pivot`];
        }
        if (name === "vol") {
            const numValue = Number(value);
            if (numValue >= 1e6) return [`${(numValue / 1e6).toFixed(1)}M`, "Volume"];
            if (numValue >= 1e3) return [`${(numValue / 1e3).toFixed(0)}k`, "Volume"];
            return [numValue, "Volume"];
        }
        if (name === "close") {
            return [Number(value).toFixed(2), "Close"];
        }
        return [value, name]; // Default return
    };

    // -------------------------------------------------------------------------
    // Render Logic: Loading, Error, Success States
    // -------------------------------------------------------------------------

    // Loading State
    if (isLoading) {
        return (
            <Card>
                <CardHeader><CardTitle>{ticker ? `${ticker} – ` : ''}Elliott Wave Analysis</CardTitle></CardHeader>
                <CardContent className="flex justify-center items-center p-8 text-muted-foreground min-h-[300px]">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading chart data…
                </CardContent>
            </Card>
        );
    }

    // Error State
    if (isError) {
        return (
            <Card>
                <CardHeader><CardTitle>{ticker ? `${ticker} – ` : ''}Elliott Wave Analysis</CardTitle></CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-8 text-destructive min-h-[300px]">
                    <AlertCircle className="h-6 w-6 mb-2" />
                    <p className="font-semibold">Error Loading Data</p>
                    <p className="text-sm text-center mt-1">
                        Could not fetch analysis{ticker ? ` for ${ticker}` : ''}. Please try again later.
                    </p>
                    {console.error("Elliott Query Error:", error?.message)}
                </CardContent>
            </Card>
        );
    }

    // No Data State (after successful fetch but empty results or processing failed)
    if (!data || !rows.length) {
        return (
            <Card>
                <CardHeader><CardTitle>{ticker ? `${ticker} – ` : ''}Elliott Wave Analysis</CardTitle></CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-8 text-muted-foreground min-h-[300px]">
                    <Info className="h-6 w-6 mb-2" />
                    <p>No analysis data available{ticker ? ` for ${ticker}` : ''}.</p>
                </CardContent>
            </Card>
        );
    }

    // Refresh function for the button
    const refresh = () => qc.invalidateQueries({ queryKey: ["elliott", ticker] });

    // --- Success State - Render the Chart ---
    return (
        <Card>
            {/* Card Header with Title, Info Popover, and Refresh Button */}
            <CardHeader className="flex flex-row justify-between items-center space-x-4">
                <div className="flex items-center gap-2">
                    <CardTitle>{ticker} – Elliott (Daily)</CardTitle>
                    <Popover>
                        <PopoverTrigger asChild>
                            <button aria-label="Chart information" className="p-0 m-0 h-auto bg-transparent border-none text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4 cursor-pointer" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 text-sm">
                            <p className="font-semibold mb-2">Chart Guide</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li><b>Blue dots</b>: Price Pivots (High/Low)</li>
                                <li><b>Labels</b>: Elliott Wave Counts (e.g., 1-5, A-C)</li>
                                <li><b>Dashed Lines</b>: Fibonacci Retracement/Extension Levels</li>
                                <li><b>Grey Bars</b>: Daily Trading Volume</li>
                                <li><b>Note</b>: X-axis shows trading days sequentially (weekends/holidays removed). Labels show approximate month starts.</li>
                            </ul>
                        </PopoverContent>
                    </Popover>
                </div>
                <Button variant="ghost" size="icon" onClick={refresh} aria-label="Refresh chart data">
                    <RefreshCw className="h-5 w-5" />
                </Button>
            </CardHeader>

            {/* Card Content holding the Chart */}
            <CardContent className="pt-2" style={{ height: '520px' }}> {/* Set chart height */}
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={rows} // Use the processed data rows
                        margin={{
                            top: 10,
                            right: 35, // Space on right for labels/Fibs
                            left: 25,  // Space on left for Y-Axis
                            bottom: 10 // Space below X-Axis
                        }}
                    >
                        {/* Background Grid */}
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />

                        {/* X Axis (Index-based, using calculated ticks) */}
                        <XAxis
                            dataKey="index"                   // Use sequential index
                            type="number"                   // Treat as numbers
                            domain={['dataMin', 'dataMax']} // Auto-detect range
                            padding={{ left: 15, right: 15 }}// Internal padding for data ends
                            // *** Use explicit ticks + overlap control ***
                            ticks={monthStartIndices}         // Provide indices for first day of each month
                            tickFormatter={formatXAxisTick} // Format the index to month name
                            interval={0}                    // Try to show all ticks in `ticks` array
                            minTickGap={40}                 // THEN, skip ticks closer than 40px to prevent overlap
                            axisLine={{ strokeOpacity: 0.5 }}
                            tickLine={{ strokeOpacity: 0.5 }}
                            tick={{ fontSize: 11 }} // Style tick labels
                        />

                        {/* Y Axis (Price) */}
                        <YAxis
                            yAxisId="price"
                            orientation="left"
                            domain={['auto', 'auto']} // Auto-calculate price range
                            tickFormatter={(price) => typeof price === 'number' ? price.toFixed(2) : ''} // Format price
                            width={60} // Allocate space for labels
                            // Axis lines visible by default
                            tick={{ fontSize: 11 }}
                        />

                        {/* Y Axis (Volume - hidden but used for scale) */}
                        <YAxis
                            yAxisId="vol"
                            orientation="right"
                            domain={[0, 'auto']} // Volume starts at 0
                            hide // Do not render visually
                        />

                        {/* Tooltip Configuration */}
                        <Tooltip
                            labelFormatter={formatTooltipLabel} // Format the label (date)
                            formatter={formatTooltipValue}    // Format each line item
                            contentStyle={{ // Style the tooltip box
                                background: 'rgba(255, 255, 255, 0.9)',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '12px',
                                boxShadow: '2px 2px 5px rgba(0,0,0,0.1)'
                            }}
                            cursor={{ stroke: '#888', strokeWidth: 0.5 }} // Style hover line
                        />

                        {/* --- Chart Data Series --- */}
                        {/* Price Line */}
                        <Line
                            yAxisId="price"
                            dataKey="close"
                            stroke="#6366f1" // Indigo color example
                            strokeWidth={1.5}
                            dot={false} // No dots on the line itself
                            isAnimationActive={false} // Disable animation for performance
                            name="Close" // Name shown in tooltip
                        />

                        {/* Volume Bars */}
                        <Bar
                            yAxisId="vol"
                            dataKey="vol"
                            barSize={3} // Adjust bar width if needed
                            fill="#a1a1aa" // Zinc color example
                            opacity={0.4}
                            isAnimationActive={false}
                            name="Volume"
                        />

                        {/* Pivot Point Dots (using memoized filtered data) */}
                        <Scatter
                            yAxisId="price"
                            data={pivotRows} // Use pre-filtered data
                            dataKey="pivotPrice"
                            shape="circle"
                            fill="#3b82f6" // Blue color example
                            isAnimationActive={false}
                            name="Pivot"
                        // size={36} // Optional: adjust dot size
                        />

                        {/* Wave Labels (using memoized filtered data and custom shape) */}
                        <Scatter
                            yAxisId="price"
                            data={waveRows} // Use pre-filtered data
                            dataKey="pivotPrice" // Position based on pivot price vertically
                            shape={(props) => <WaveShape {...props} />} // Render custom SVG shape
                            fill="transparent" // The scatter point itself is invisible
                            isAnimationActive={false}
                        />

                        {/* Fibonacci Reference Lines (memoized) */}
                        {fibLines}

                    </ComposedChart>
                </ResponsiveContainer>

                {/* Kelly Fraction Display */}
                <p className="text-xs text-muted-foreground mt-2 text-right pr-4">
                    Kelly Fraction:
                    <span className="font-semibold text-foreground">
                        {(data.kelly_fraction * 100).toFixed(0)}%
                    </span>
                </p>
            </CardContent>
        </Card>
    );
};