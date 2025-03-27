// src/types/stockTypes.ts

export interface ExecutiveSummary {
    name: string;
  }
  
  export interface CompanyOverview {
    sector: string | null;
    industry: string | null;
    description: string | null;
  }
  
  export interface FinancialPerformance {
    gross_margin: number | null;
    operating_margin: number | null;
    net_margin: number | null;
  }
  
  export interface ValuationMetrics {
    pe_ratio: number | null;
    ev_ebitda: number | null;
    peg_ratio: number | null;
    dividend_yield: number | null;
    // Add more if you want to enrich this section:
    price_to_sales?: number | null;
    price_to_book?: number | null;
  }
  
  export interface InvestorMetrics {
    rule_of_40: number;
    ebitda_margin: number | null;
    revenue_growth: number;
    fcf_margin: number | null;
    cash_conversion_ratio: number;
    capex_ratio: number;
  }
  
  export interface RiskMetrics {
    annual_volatility: number | null;
    max_drawdown: number | null;
    beta: number | null;
  }
  
  export interface StockPrice {
    date: string;
    close: number;
  }
  
  export interface SMAValue {
    date: string;
    SMA_50?: number;
    SMA_200?: number;
  }
  
  export interface TechnicalAnalysis {
    stock_prices: StockPrice[];
    sma_50: SMAValue[];
    sma_200: SMAValue[];
  }
  
  export interface StockData {
    executive_summary: ExecutiveSummary;
    company_overview: CompanyOverview;
    financial_performance: FinancialPerformance;
    investor_metrics: InvestorMetrics;
    valuation_metrics: ValuationMetrics;
    risk_metrics: RiskMetrics;
    technical_analysis: TechnicalAnalysis;
  }
  