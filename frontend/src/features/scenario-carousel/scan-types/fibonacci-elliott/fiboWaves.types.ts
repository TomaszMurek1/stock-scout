/** One daily candle with close price and volume */
export type Candle = {
    date: string;             // YYYY-MM-DD date string
    close: number;            // Closing price
    volume: number | null;    // Trading volume (may be null)
};

/** Identified pivot point (high or low) */
export type Pivot = {
    index: number;            // Original index in the candles array
    price: number;            // Pivot price value
    kind: "high" | "low";     // Whether it's a high or low pivot
};

/** Elliott wave label attached to a pivot */
export type Wave = {
    pivot_index: number;      // Original pivot index
    pivot_price: number;      // Pivot price (duplicate of Pivot.price)
    wave_label: string;       // Label, e.g. "1", "2", "A", "B"
};

/** One set of Fibonacci levels covering a range of candles */
export type Fibo = {
    range: [number, number];              // [startIndex, endIndex] in original candles
    fib_levels: Record<number, boolean>;  // Percentage (0.382, 0.618, etc.) → whether that level was hit
};

/** API response shape */
export interface ApiResp {
    candles: Candle[];
    pivots: Pivot[];
    waves: Wave[];
    fibo: Fibo[];
    kelly_fraction: number;  // Calculated Kelly fraction for position sizing
}

/** Prepared row type for Recharts plotting */
export type ChartRow = {
    index: number;           // Sequential gap-free X-axis index
    date: string;            // Original date string
    timestamp: number;       // Milliseconds UTC timestamp
    close: number;           // Close price
    vol: number;             // Volume (null → 0)
    pivotPrice?: number;     // If this row is a pivot, its price
    pivot: Pivot | null;     // Full pivot info, or null
    waves: Wave[];           // Any wave labels at this index
};