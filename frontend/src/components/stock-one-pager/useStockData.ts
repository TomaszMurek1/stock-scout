import { useEffect, useState } from "react";
import type { StockData } from "./stock-one-pager.types";
import { apiClient } from "@/services/apiClient";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

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
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get<StockData>(
          `/stock-details/${ticker}`,
          { params: { short_window: shortWindow, long_window: longWindow } }
        );
        setStock(response.data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch stock details.");
      } finally {
        setLoading(false);
      }
    })();
  }, [ticker, shortWindow, longWindow]);

  return { stock, isLoading, error };
}
