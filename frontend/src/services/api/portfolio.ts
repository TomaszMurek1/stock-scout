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
