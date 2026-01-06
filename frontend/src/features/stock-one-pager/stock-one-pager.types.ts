import { Nullable } from "@/components/types/shared.types";


export interface ExecutiveSummary {
  ticker: Nullable<string>;
  name: Nullable<string>;
  sector: Nullable<string>;
  industry: Nullable<string>;
  currency: Nullable<string>;
}

export interface CompanyOverview {
  id: number;
  sector: Nullable<string>;
  industry: Nullable<string>;
  description: Nullable<string>;
  website: Nullable<string>;
  country: Nullable<string>;
}

export interface FinancialPerformance {
  gross_margin: Nullable<number>;
  operating_margin: Nullable<number>;
  net_margin: Nullable<number>;
  shares_outstanding: Nullable<number>;
}

export interface ValuationMetrics {
  pe_ratio: Nullable<number>;
  ev_ebitda: Nullable<number>;
  peg_ratio: Nullable<number>;
  dividend_yield: Nullable<number>;
  price_to_sales?: Nullable<number>;
  price_to_book?: Nullable<number>;
}

export interface InvestorMetrics {
  rule_of_40: number;
  ebitda_margin: Nullable<number>;
  revenue_growth: number;
  fcf_margin: Nullable<number>;
  cash_conversion_ratio: number;
  capex_ratio: number;
}

export interface RiskMetrics {
  annual_volatility: Nullable<number>;
  max_drawdown: Nullable<number>;
  beta: Nullable<number>;
}

interface HistoricalData {
  date: string;
  close: number;
  sma_short?: number;
  sma_long?: number;
}

export interface TechnicalAnalysis {
  momentum_30d: number;
  momentum_90d: number;
  volatility_30d: number;
  range_position_52w: number;
  golden_cross: boolean;
  death_cross: boolean;
  historical: HistoricalData[];
}
interface TrendItem {
  year: number;
  date?: string;
  value: number;
}

export interface MetricTrends {
  revenue: TrendItem[];
  net_income: TrendItem[];
  ebitda: TrendItem[];
  free_cash_flow: TrendItem[];
  eps?: TrendItem[];
  gross_profit?: TrendItem[];
  operating_income?: TrendItem[];
  dividends_paid?: TrendItem[];
}

export interface FinancialTrends {
  annual: MetricTrends;
  quarterly: MetricTrends;
}

export interface StockData {
  delisted?: boolean;
  message?: string;
  executive_summary: ExecutiveSummary;
  company_overview: CompanyOverview;
  financial_performance: FinancialPerformance;
  investor_metrics: InvestorMetrics;
  valuation_metrics: ValuationMetrics;
  risk_metrics: RiskMetrics;
  technical_analysis: TechnicalAnalysis;
  financial_trends: FinancialTrends;
  analysis_dashboard?: AnalysisDashboard;
}

export interface DebtTrend {
  latest?: number | null;
  previous?: number | null;
  change?: number | null;
  direction?: string | null;
}

export interface AnalysisDashboard {
  total_revenue?: Nullable<number>;
  net_income?: Nullable<number>;
  eps?: Nullable<number>;
  operating_income?: Nullable<number>;
  operating_cash_flow?: Nullable<number>;
  forecast_revenue_growth_rate?: Nullable<number>;
  forecast_eps_growth_rate_short?: Nullable<number>;
  forecast_eps_growth_rate_long?: Nullable<number>;
  forecast_revision_direction?: Nullable<string>;
  return_on_assets?: Nullable<number>;
  return_on_invested_capital?: Nullable<number>;
  interest_coverage?: Nullable<number>;
  cfo_to_total_debt?: Nullable<number>;
  total_debt_trend?: DebtTrend | null;
  current_ratio?: Nullable<number>;
  debt_to_assets?: Nullable<number>;
  ohlson_indicator_score?: Nullable<number>;
  analyst_price_target?: Nullable<number>;
  upside?: Nullable<number>;
}

export type MetricStatus = "success" | "danger" | "warning" | "neutral" | "good" | "bad";

export interface MetricConfig {
  label: string;
  value: string | number;
  description: string;
  definition: string;
  criterion: string;
  icon?: React.ReactNode;
  status?: MetricStatus;
  meets?: boolean;
  valueClass?: string;
  isProgressBar?: boolean;
  progressValue?: number; // 0-100
  progressThreshold?: number; // Value at which it becomes "good"
  progressMax?: number;
}

