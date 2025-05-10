import { WatchlistStock } from "@/components/portfolio-management/watchlist/types";
import { apiClient } from "../apiClient";

export async function toggleWatchlist(ticker: string, isFav: boolean): Promise<void> {
  const url = `/watchlist/${ticker}`;
  if (isFav) {
    await apiClient.delete(url);
  } else {
    await apiClient.post(url);
  }
}

export async function fetchWatchlist(): Promise<WatchlistStock[]> {
  const res = await apiClient.get(`/watchlist`);
  return res.data;
}
