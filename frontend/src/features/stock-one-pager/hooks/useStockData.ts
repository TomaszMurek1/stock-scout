import { useEffect, useState } from "react";
import { StockData } from "../stock-one-pager.types";
import { apiClient } from "@/services/apiClient";
import { toast } from "react-toastify";

export function useStockData(
  ticker: string | undefined,
  shortWindow = 50,
  longWindow = 200
): { stock: StockData | null; isLoading: boolean; error: string | null; isRefreshed: boolean } {
  const [stock, setStock] = useState<StockData | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshed, setIsRefreshed] = useState(false);

  useEffect(() => {
    if (!ticker) return;

    // Create an abort controller to cancel request if component unmounts or ticker changes
    const controller = new AbortController();
    let refreshTimeout: NodeJS.Timeout;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setIsRefreshed(false);
        
        const response = await apiClient.get<StockData & { background_update_scheduled?: boolean }>(
          `/stock-details/${ticker}`,
          { 
            params: { short_window: shortWindow, long_window: longWindow },
            signal: controller.signal 
          }
        );
        
        // Only update state if not aborted
        if (!controller.signal.aborted) {
            setStock(response.data);

            if (response.data.background_update_scheduled) {
                // If backend indicated a background update is in progress, check back in 4s
                refreshTimeout = setTimeout(async () => {
                    if (controller.signal.aborted) return;
                    try {
                        const refreshResponse = await apiClient.get<StockData>(
                            `/stock-details/${ticker}`,
                            { 
                              params: { short_window: shortWindow, long_window: longWindow },
                              signal: controller.signal 
                            }
                        );
                        if (!controller.signal.aborted) {
                            setStock(refreshResponse.data);
                            setIsRefreshed(true);
                            setTimeout(() => setIsRefreshed(false), 2500);
                        }
                    } catch (e) {
                        // Silent fail on refresh is fine
                    }
                }, 4000);
            }
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
        if (refreshTimeout) clearTimeout(refreshTimeout);
    };
  }, [ticker, shortWindow, longWindow]);

  return { stock, isLoading, error, isRefreshed };
}
