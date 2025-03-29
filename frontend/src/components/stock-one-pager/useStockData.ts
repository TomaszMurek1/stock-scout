import { useEffect, useState } from "react";
import type { StockData } from "./stock-one-pager.types";

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
        const response = await fetch(`${API_URL}/stock-details/${ticker}`);
        if (!response.ok) {
          const errBody = await response.json();
          throw new Error(errBody.detail || "Failed to fetch stock details.");
        }
        const data: StockData = await response.json();
        setStock(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [ticker]);

  return { stock, isLoading, error };
}
