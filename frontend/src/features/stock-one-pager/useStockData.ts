import { useEffect, useState } from "react";
import type { StockData } from "./stock-one-pager.types";
import { apiClient } from "@/services/apiClient";

export function useStockData(
  ticker: string | undefined,
  shortWindow = 50,
  longWindow = 200
): { stock: StockData | null; isLoading: boolean; error: string | null } {
  const [stock, setStock] = useState<StockData | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;

    // Create an abort controller to cancel request if component unmounts or ticker changes
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiClient.get<StockData>(
          `/stock-details/${ticker}`,
          { 
            params: { short_window: shortWindow, long_window: longWindow },
            signal: controller.signal 
          }
        );
        
        // Only update state if not aborted
        if (!controller.signal.aborted) {
            setStock(response.data);
        }
      } catch (err: any) {
        // Ignore abort errors
        if (err.name === 'CanceledError' || err.name === 'AbortError' || controller.signal.aborted) {
            return;
        }
        setError(err.message || "Failed to fetch stock details.");
      } finally {
        if (!controller.signal.aborted) {
            setLoading(false);
        }
      }
    })();

    // Cleanup function cancels the request
    return () => {
        controller.abort();
    };
  }, [ticker, shortWindow, longWindow]);

  return { stock, isLoading, error };
}
