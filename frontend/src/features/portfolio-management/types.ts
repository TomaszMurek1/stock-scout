export type CurrencyCode = "USD" | "EUR" | "GBP" | "PLN";

export type Period = "1d" | "1w" | "1m" | "3m" | "6m" | "1y" | "ytd" | "itd";

export interface PortfolioStock {
  shares_number: number;
  ticker: string;
  name: string;
  purchasePrice: number;
  currentPrice: number;
  currency: string;
}

export interface PortfolioInfo {
  id: number;
  name: string;
  currency: string;
}

export interface HoldingItem {
  ticker: string;
  name: string;
  shares: number;
  average_price: number;
  last_price: number;
  currency: string;
}

export interface WatchlistItem {
  ticker: string;
  name: string;
}

export interface CurrencyRate {
  from: string;
  to: string;
  rate: number;
}

export interface Account {
  id: number;
  name: string;
  type: string;
  currency: string;
  cash: number;
}

export interface UserPortfolioResponse {
  portfolio: PortfolioInfo;
  accounts: Account[];
  holdings: HoldingItem[];
  watchlist: WatchlistItem[];
  currency_rates: CurrencyRate[];
}

export interface AddStockPayload {
  ticker: string;
  shares: number;
  price: number;
  fee?: number;
}

export interface Portfolio {
  id: number;
  name: string;
  currency: CurrencyCode;
  total_value: number;
  cash_available: number;
  invested_value_current: number;
  net_invested_cash: number;
  accounts?: Account[];
}

export interface PerformanceMetrics {
  ttwr: Record<string, number>;
  ttwr_invested: Record<string, number>;
  mwrr: Record<string, number>;
}

export interface PortfolioBreakdown {
  beginning_value: number;
  ending_value: number;
  cash_flows: {
    deposits: number;
    withdrawals: number;
    net_external: number;
  };
  income_expenses: {
    dividends: number;
    interest: number;
    fees: number;
    taxes: number;
  };
  pnl: {
    total_pnl_ex_flows: number;
    realized_gains_approx: number;
    unrealized_gains_residual: number;
    currency_effects: number;
    note_realized?: string;
  };
  invested?: {
    beginning_value: number;
    ending_value: number;
    net_trades: number;
    capital_gains: number;
    simple_return_pct: number;
  };
  metrics_context?: {
    timing_quality: string;
    warning_type: string | null;
    simple_return_pct: number;
  };
}

export interface PortfolioPerformance {
  portfolio_id: number;
  as_of_date?: string;
  unit?: string;
  performance: any;
  period_meta?: any;
  breakdowns?: any;
}

export interface WatchlistStock {
  company_id?: number;
  ticker: string;
  name: string;
  sector?: string | null;
  industry?: string | null;
  added_at?: string | null;
  market_data?: {
    last_price: number | null;
    currency: string | null;
    last_updated: string | null;
    sma_50?: number;
    sma_200?: number;
  };
  note?: {
    research_status?: string | null;
    sentiment_score?: number | null;
    sentiment_trend?: string | null;
    intrinsic_value_low?: number | null;
    intrinsic_value_high?: number | null;
    margin_of_safety?: number | null;
    tags?: string[] | null;
  } | null;
  is_held?: boolean;
  held_shares?: number | null;
  average_price?: number | null;
}

export interface CurrencyRate {
  rate: number; // e.g. 3.95
  last_updated: string; // ISO date
}

export type Transaction = {
  id: number; // unique identifier for the transaction
  ticker: string;
  name: string;
  transaction_type: "buy" | "sell" | "dividend" | "tax" | "fee" | "interest" | "deposit" | "withdrawal";
  shares: string | number;
  price: string | number;
  fee?: string | number; // optional, can be 0
  timestamp: string; // ISO date
  currency: string;
  currency_rate: string | number; // rate used when transaction was made
  amount?: number; // Optional derived field
};

export type Holding = {
  ticker: string;
  shares: number;
  avg_cost: number; // in portfolio currency
};

export type LatestPriceMap = Record<string, number>; // latest price in native currency

export type LatestFXMap = Record<string, number>; // e.g. { USD: 3.95, PLN: 1, GBP: 5.1 }

export type HistoricalRate = {
  date: string;
  close: string | number;
};

export type PriceHistoryEntry = {
  date: string;
  close: number;
};

export type CurrencyRates = Record<
  string,
  {
    historicalData: HistoricalRate[];
  }
>;

export type InvestedPerHolding = Record<
  string,
  {
    investedInHolding: number;
    investedInPortfolio: number;
  }
>;

export type ApiHolding = {
  ticker: string;
  name: string;
  shares: number;
  instrument_ccy: string;
  average_cost_portfolio_ccy: number;
  average_cost_instrument_ccy: number;
  fx_rate_to_portfolio_ccy: number;
  last_price: number;
  period_pnl: Record<string, number>;
  period_pnl_instrument_ccy: Record<string, number>;
  sma_50?: number;
  sma_200?: number;
};
