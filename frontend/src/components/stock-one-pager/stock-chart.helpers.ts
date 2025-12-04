import { format, parseISO, startOfMonth, addDays } from "date-fns";

export interface HistoricalData {
  date: string;
  price: number;
  sma_short?: number;
  sma_long?: number;
}

export const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", { month: "short" });

export const getPriceFormatter = (maxPrice: number) => {
  if (maxPrice < 5) return (price: number) => price.toFixed(2);
  if (maxPrice < 10) return (price: number) => price.toFixed(1);
  return (price: number) => price.toFixed(0);
};

export const calculateYAxisDomain = (min: number, max: number) => {
  if (!isFinite(min) || !isFinite(max) || min === max) {
     const base = isFinite(min) ? min : 0;
     return { niceMin: base - 1, niceMax: base + 1, step: 0.5 };
  }
  
  const range = max - min;
  // Target roughly 5-8 ticks
  const targetTicks = 6;
  const rawStep = range / targetTicks;

  // Calculate magnitude of the step
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;

  // Pick a nice step multiple
  let niceStep;
  if (residual > 5) niceStep = 10 * magnitude;
  else if (residual > 2) niceStep = 5 * magnitude;
  else if (residual > 1) niceStep = 2 * magnitude;
  else niceStep = 1 * magnitude;

  // Recalculate nice min and max
  const niceMin = Math.floor(min / niceStep) * niceStep;
  const niceMax = Math.ceil(max / niceStep) * niceStep;

  return { niceMin, niceMax, step: niceStep };
};

export const generateYAxisTicks = (min: number, max: number, step: number) => {
  const ticks = [];
  // Use integer arithmetic to avoid floating point issues
  const count = Math.round((max - min) / step);
  
  for (let i = 0; i <= count; i++) {
    const val = min + (i * step);
    ticks.push(Number(val.toFixed(2))); // Round to 2 decimals for clean display
  }
  return ticks;
};

export const getMonthlyTicks = (data: HistoricalData[]) => {
  const months = new Set();
  const monthlyTicks = data
    .filter((entry) => {
      const month = format(new Date(entry.date), "yyyy-MM");
      if (!months.has(month)) {
        months.add(month);
        return true;
      }
      return false;
    })
    .map((entry) => format(startOfMonth(new Date(entry.date)), "yyyy-MM-dd"));
  return monthlyTicks;
};

/**
 * Detect SMA50 / SMA200 crossovers and mark them.
 * If SMA50 crosses above SMA200 → Green dot (bullish)
 * If SMA50 crosses below SMA200 → Red dot (bearish)
 */
export const detectCrossovers = (data: HistoricalData[]) => {
  const crossovers: { date: string; bullish?: number; bearish?: number }[] = [];

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];

    if (prev.sma_short !== undefined && prev.sma_long !== undefined && curr.sma_short !== undefined && curr.sma_long !== undefined) {
      // Detect crossovers
      const wasBelow = prev.sma_short < prev.sma_long;
      const isAbove = curr.sma_short > curr.sma_long;

      const wasAbove = prev.sma_short > prev.sma_long;
      const isBelow = curr.sma_short < curr.sma_long;

      if (wasBelow && isAbove) {
        // Bullish crossover (Golden Cross)
        crossovers.push({ date: curr.date, bullish: curr.sma_short });
      } else if (wasAbove && isBelow) {
        // Bearish crossover (Death Cross)
        crossovers.push({ date: curr.date, bearish: curr.sma_short });
      }
    }
  }

  return crossovers;
};

export const fillHistoricalData = (data: HistoricalData[]): HistoricalData[] => {
  if (data.length === 0) return [];

  const filledData: HistoricalData[] = [];
  let lastKnownPrice = data[0].price;
  let lastKnownSMA50 = data[0].sma_short;
  let lastKnownSMA200 = data[0].sma_long;

  let currentDate = parseISO(data[0].date);
  let lastIndex = 0;

  while (lastIndex < data.length) {
    const entry = data[lastIndex];
    const entryDate = parseISO(entry.date);

    while (currentDate < entryDate) {
      // Fill missing day with last known data
      filledData.push({
        date: format(currentDate, "yyyy-MM-dd"),
        price: lastKnownPrice,
        sma_short: lastKnownSMA50,
        sma_long: lastKnownSMA200,
      });

      // Move to next day
      currentDate = addDays(currentDate, 1);
    }

    // Add actual stock data entry
    filledData.push(entry);
    lastKnownPrice = entry.price;
    lastKnownSMA50 = entry.sma_short;
    lastKnownSMA200 = entry.sma_long;

    currentDate = addDays(entryDate, 1)
    lastIndex++
  }
  return filledData;
};
