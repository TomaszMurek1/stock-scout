export interface IGmmaSqueezeResultItem {
  ticker: string;
  name: string;
  trend: "up" | "down";
  close: number;
  starter_yesterday_pct: number;
  starter_today_pct: number;
  red_width_pct: number;
  blue_width_pct: number;
  opor_20d: number | null;
  ciasny_stop_3d: number | null;
  date: string;
}

export interface GmmaSqueezeResponse {
  status: string;
  data: IGmmaSqueezeResultItem[];
}

export interface IGmmaChartDataPoint {
  date: string;
  close: number;
  sma_200: number | null;
  czerw_top: number;
  czerw_bot: number;
  nieb_top: number;
  nieb_bot: number;
  ziel_top: number;
}

export interface IGmmaChartResponse {
  ticker: string;
  data: IGmmaChartDataPoint[];
}
