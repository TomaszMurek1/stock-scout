export type CurrencyCode = "USD" | "EUR" | "GBP" | "PLN";

export type Period = "1d" | "1w" | "1m" | "3m" | "6m" | "1y" | "ytd" | "itd";

export interface Account {
  id: number;
  name: string;
  type: string;
  currency: string;
  cash: number;
  iban?: string;
}

export interface Portfolio {
  id: number;
  name: string;
  currency: CurrencyCode;
  total_value: number;
  cash_available: number;
  invested_value_current: number;
  net_invested_cash: number;
  net_deposits?: number;
  accounts?: Account[];
}

export interface ClosedPosition {
  company_id: number;
  ticker: string;
  name: string;
  sell_date: string;
  quantity: number;
  sell_price: number;
  sell_currency: string;
  sell_fx_rate: number;
  proceeds_pcy: number;
  proceeds_icy: number;
  cost_basis_pcy: number;
  cost_basis_icy: number;
  realized_pnl: number;
  realized_pnl_icy: number;
  realized_pnl_pct: number;
  holding_period_days: number | null;
}

export interface PortfolioPerformance {
  portfolio_id: number;
  as_of_date?: string;
  unit?: string;
  realized_pnl?: number;
  closed_positions?: ClosedPosition[];
  performance: any;
  period_meta?: any;
  breakdowns?: any;
}


export type Transaction = {
  id: number;
  ticker: string;
  name: string;
  transaction_type: "buy" | "sell" | "dividend" | "tax" | "fee" | "interest" | "deposit" | "withdrawal";
  shares: string | number;
  price: string | number;
  fee?: string | number;
  timestamp: string; // ISO date
  currency: string;
  currency_rate: string | number;
  amount?: number;
};

export type ApiHolding = {
  ticker: string;
  name: string;
  shares: number;
  account_id: number;
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
