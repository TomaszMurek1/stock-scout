import { useEffect, useState } from "react";
import type { StockData } from "./stock-one-pager.types";
import { apiClient } from "@/services/apiClient";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export function useStockData(ticker: string | undefined): {
  stock: StockData | null;
  isLoading: boolean;
  error: string | null;
} {
  const [stock, setStock] = useState<StockData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiClient.get<StockData>(`/stock-details/${ticker}`);
        setStock(response.data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch stock details.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [ticker]);

  return { stock, isLoading, error };
}
