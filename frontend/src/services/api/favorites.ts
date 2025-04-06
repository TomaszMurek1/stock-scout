import { apiClient } from "../apiClient";

export async function toggleFavorite(ticker: string, isFav: boolean): Promise<void> {
  const url = `/favorites/${ticker}`;
  if (isFav) {
    await apiClient.delete(url);
  } else {
    await apiClient.post(url);
  }
}

export async function fetchFavorites(): Promise<string[]> {
  const res = await apiClient.get(`/favorites`);
  return res.data.map((f: { ticker: string }) => f.ticker); // or adapt to your backend's return shape
}
