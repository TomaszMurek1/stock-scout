// src/types/stockTypes.ts

import { Nullable } from "../types/shared.types";

export interface ExecutiveSummary {
    ticker: Nullable<string>,
    name: Nullable<string>,
    sector: Nullable<string>,
    industry: Nullable<string>,
    currency: Nullable<string>
  }
  
  export interface CompanyOverview {
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
  }
  
  export interface ValuationMetrics {
    pe_ratio: Nullable<number>;
    ev_ebitda: Nullable<number>;
    peg_ratio: Nullable<number>;
    dividend_yield: Nullable<number>;
    // Add more if you want to enrich this section:
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
  
  export interface StockPrice {
    date: string;
    close: number;
  }
  
  export interface SMAValue {
    date: string;
    sma_short?: number;
    sma_long?: number;
  }
  
  export interface TechnicalAnalysis {
    momentum_30d: number,
    momentum_90d: number,
    volatility_30d: number,
    range_position_52w: number,
    golden_cross: boolean,
    death_cross: boolean,
    stock_prices: StockPrice[];
    sma_short: SMAValue[];
    sma_long: SMAValue[];
  }
  interface TrendItem {
    year: number;
    value: number;
  }
  interface FinancialTrends {
    revenue: TrendItem[];
    net_income: TrendItem[];
    ebitda: TrendItem[];
    free_cash_flow: TrendItem[];
  }

  export interface StockData {
    executive_summary: ExecutiveSummary;
    company_overview: CompanyOverview;
    financial_performance: FinancialPerformance;
    investor_metrics: InvestorMetrics;
    valuation_metrics: ValuationMetrics;
    risk_metrics: RiskMetrics;
    technical_analysis: TechnicalAnalysis;
    financial_trends: FinancialTrends;
  }
  