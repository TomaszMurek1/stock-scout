import { apiClient } from "./apiClient";

export interface FxRateResponse {
    rate: number;
    date: string;
}

/**
 * Get the latest FX rate between two currencies
 * If base === quote, returns 1.0
 */
export async function getLatestFxRate(
    baseCurrency: string,
    quoteCurrency: string
): Promise<number> {
    if (baseCurrency === quoteCurrency) {
        return 1.0;
    }

    try {
        const response = await apiClient.post<Record<string, { base: string; quote: string; historicalData: { date: string; close: number }[] }>>("/fx/batch", {
            pairs: [{ base: baseCurrency, quote: quoteCurrency }],
        });

        const key = `${baseCurrency}-${quoteCurrency}`;
        const data = response.data[key];
        
        if (data?.historicalData && data.historicalData.length > 0) {
            // Get the most recent rate
            const latest = data.historicalData[data.historicalData.length - 1];
            return latest.close;
        }
        
        return 1.0; // Fallback
    } catch (error) {
        console.error("Error fetching FX rate:", error);
        return 1.0; // Fallback to 1.0 on error
    }
}
