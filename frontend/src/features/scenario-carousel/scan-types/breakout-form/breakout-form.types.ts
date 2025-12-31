export interface IBreakoutResultItem {
  ticker: string;
  name: string;
  current_price: number;
  range_high: number;
  range_low: number;
  range_pct: number;
  volume: number;
  date: string;
}

export interface BreakoutScanResponse {
  status: string;
  data: IBreakoutResultItem[];
}
