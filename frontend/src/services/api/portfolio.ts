import { apiClient } from "../apiClient";

export interface TradeRequest {
  company_id: number;
  quantity: number;
  price: number;
}

export async function buyStock(company_id: number, quantity: number, price: number) {
  const payload: TradeRequest = { company_id, quantity, price };
  return apiClient.post("/portfolio/buy", payload);
}

export async function sellStock(company_id: number, quantity: number, price: number) {
  const payload: TradeRequest = { company_id, quantity, price };
  return apiClient.post("/portfolio/sell", payload);
}

export async function fetchPortfolioData(): Promise<any[]> {
  const res = await apiClient.get(`/portfolio-management`);
  return res.data.watchlist // or adapt to your backend's return shape
}
