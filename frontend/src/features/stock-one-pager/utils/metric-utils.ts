import { formatCurrency, formatNumber, formatPercentage } from "@/utils/formatting";
import { Nullable } from "@/components/types/shared.types";
import { 
  StockData, 
  MetricConfig, 
  MetricStatus,
  AnalysisDashboard,
  FinancialPerformance,
  ValuationMetrics,
  RiskMetrics
} from "../stock-one-pager.types";
import { meetsThreshold, statusFromMeets } from "./metric-helpers";

export const getMetricStatus = (label: string, raw:Nullable<number>): MetricStatus => {
  if (!raw) return "neutral";

  switch (label) {
    case "P/E Ratio":
      if (raw < 5 || raw > 40) return "bad";
      if (raw >= 10 && raw <= 25) return "good";
      return "neutral";

    case "EV/EBITDA":
      return raw < 6 ? "good" : raw < 12 ? "neutral" : "bad";

    case "PEG Ratio":
      return raw <= 1 ? "good" : raw <= 2 ? "neutral" : "bad";

    case "Dividend Yield":
      return raw >= 0.02 && raw <= 0.06 ? "good" : raw > 0.1 ? "bad" : "neutral";

    case "Price to Sales":
      return raw < 2 ? "good" : raw < 5 ? "neutral" : "bad";

    case "Price to Book":
      return raw < 1.5 ? "good" : raw < 3 ? "neutral" : "bad";

    case "Gross Margin":
      return raw > 0.5 ? "good" : raw > 0.2 ? "neutral" : "bad";

    case "Operating Margin":
      return raw > 0.3 ? "good" : raw > 0.1 ? "neutral" : "bad";

    case "Net Margin":
      return raw > 0.2 ? "good" : raw > 0.05 ? "neutral" : "bad";

    case "Rule of 40":
      return raw >= 40 ? "good" : raw >= 30 ? "neutral" : "bad";

    case "EBITDA Margin":
      return raw > 0.2 ? "good" : raw > 0.1 ? "neutral" : "bad";

    case "Revenue Growth":
      return raw > 0.15 ? "good" : raw >= 0 ? "neutral" : "bad";

    case "FCF Margin":
      return raw > 0.1 ? "good" : raw > 0.03 ? "neutral" : "bad";

    case "Cash Conversion":
      return raw > 0.9 ? "good" : raw > 0.5 ? "neutral" : "bad";

    case "CapEx Ratio":
      return raw < 0.1 ? "good" : raw < 0.2 ? "neutral" : "bad";

    case "Annual Volatility":
      return raw < 0.2 ? "good" : raw < 0.4 ? "neutral" : "bad";

    case "Max Drawdown":
      return raw > -0.2 ? "good" : raw > -0.5 ? "neutral" : "bad";

    case "Beta":
      return raw < 1 ? "good" : raw < 1.5 ? "neutral" : "bad";

    default:
      return "neutral";
  }
};

// --- Builders ---

export const buildProfitabilityGrowthMetrics = (
  analysisDashboard: AnalysisDashboard,
  financialPerformance: FinancialPerformance
): MetricConfig[] => [
  (() => {
    const meets = meetsThreshold(analysisDashboard.return_on_assets, 0.15);
    return {
      label: "Return on Assets (ROA)",
      value: formatPercentage(analysisDashboard.return_on_assets),
      criterion: "ROA (≥15%)",
      definition: "ROA = Net Income / Total Assets",
      description: "How efficiently assets are used to generate profit.",
      meets,
      status: statusFromMeets(meets),
    };
  })(),
  (() => {
    const meets = meetsThreshold(analysisDashboard.return_on_invested_capital, 0.15);
    return {
      label: "ROIC",
      value: formatPercentage(analysisDashboard.return_on_invested_capital),
      criterion: "ROIC (≥15%)",
      definition: "ROIC = Operating Income / (Debt + Equity)",
      description: "Efficiency of allocated capital.",
      meets,
      status: statusFromMeets(meets),
    };
  })(),
  (() => {
    const meets = meetsThreshold(financialPerformance.operating_margin, 0.2);
    return {
      label: "Operating Margin",
      value: formatPercentage(financialPerformance.operating_margin),
      criterion: "Operating Margin (≥20%)",
      definition: "Operating Margin = Operating Income / Revenue",
      description: "Profit after core operations costs.",
      meets,
      status: statusFromMeets(meets),
    };
  })(),
  (() => {
    const meets = meetsThreshold(analysisDashboard.forecast_revenue_growth_rate, 0.05);
    return {
      label: "Revenue CAGR (2Y)",
      value: formatPercentage(analysisDashboard.forecast_revenue_growth_rate),
      criterion: "Revenue CAGR 2Y (≥5%)",
      definition: "Compound annual revenue growth over last 2 years.",
      description: "Average annual revenue growth rate.",
      meets,
      status: statusFromMeets(meets),
    };
  })(),
];

export const buildSafetyMetrics = (analysisDashboard: AnalysisDashboard): MetricConfig[] => {
  const currentRatioValue = formatNumber(analysisDashboard.current_ratio, 2);
  const currentRatioMeets = meetsThreshold(analysisDashboard.current_ratio, 1);
  const debtToAssetsMeets = meetsThreshold(analysisDashboard.debt_to_assets, 0.4, true);
  const interestCoverageFormatted = formatNumber(analysisDashboard.interest_coverage, 2);
  const interestCoverageMeets = meetsThreshold(analysisDashboard.interest_coverage, 3);
  const ohlsonMeets = meetsThreshold(analysisDashboard.ohlson_indicator_score, 0.02, true);

  return [
    {
      label: "Current Ratio",
      value: `${currentRatioValue}x`,
      criterion: "Current Ratio (>1.0)",
      description: "Ability to pay short-term obligations.",
      definition: "Current Ratio = Current Assets / Current Liabilities",
      meets: currentRatioMeets,
      status: statusFromMeets(currentRatioMeets),
    },
    {
      label: "Debt to Assets",
      value: formatPercentage(analysisDashboard.debt_to_assets),
      criterion: "Debt to Assets (<40%)",
      description: "Proportion of assets financed by debt.",
      definition: "Debt to Assets = Total Debt / Total Assets",
      meets: debtToAssetsMeets,
      status: statusFromMeets(debtToAssetsMeets),
    },
    {
      label: "Interest Coverage",
      value: `${interestCoverageFormatted}x`,
      criterion: "Interest Coverage (>3x)",
      description: "Ability to pay interest on outstanding debt.",
      definition: "Interest Coverage = Operating Income / Interest Expense",
      meets: interestCoverageMeets,
      status: statusFromMeets(interestCoverageMeets),
    },
    {
      label: "Ohlson Score",
      value: formatPercentage(analysisDashboard.ohlson_indicator_score),
      criterion: "Ohlson Score (<2%)",
      description: "Probability of bankruptcy.",
      definition: "Ohlson O-Score model.",
      meets: ohlsonMeets,
      status: statusFromMeets(ohlsonMeets),
    },
  ];
};

export const buildValuationTimingMetrics = (
  analysisDashboard: AnalysisDashboard,
  currencyCode: string
): MetricConfig[] => {
  const meets = meetsThreshold(analysisDashboard.upside, 0.1);
  return [
    {
      label: "Upside Potential",
      value: formatPercentage(analysisDashboard.upside),
      criterion: "Upside (≥10%)",
      definition: "Upside = (Target - Current) / Current",
      description: "Potential gain to analyst target price.",
      meets,
      status: statusFromMeets(meets),
    },
    {
      label: "Analyst Target",
      value: formatCurrency({
        value: analysisDashboard.analyst_price_target,
        currency: currencyCode,
        notation: "compact",
      }),
      criterion: "Consensus Price Target.",
      definition: "Mean analyst 12-month price target.",
      description: "Average price target from Wall St analysts.",
      status: "neutral" as MetricStatus,
    },
  ];
};

export const buildValuationMetrics = (valuationMetrics: ValuationMetrics): MetricConfig[] => [
  {
    label: "P/E Ratio",
    value: valuationMetrics.pe_ratio?.toFixed(2) || "N/A",
    criterion: "Price to Earnings.",
    definition: "P/E = Price / EPS",
    description: "Price paid for $1 of earnings.",
    status: getMetricStatus("P/E Ratio", valuationMetrics.pe_ratio),
  },
  {
    label: "EV/EBITDA",
    value: valuationMetrics.ev_ebitda?.toFixed(2) || "N/A",
    criterion: "EV / EBITDA.",
    definition: "Enterprise Value / EBITDA",
    description: "Capital-structure neutral valuation.",
    status: getMetricStatus("EV/EBITDA", valuationMetrics.ev_ebitda),
  },
  {
    label: "Div Yield",
    value: valuationMetrics.dividend_yield
      ? formatPercentage(valuationMetrics.dividend_yield)
      : "N/A",
    criterion: "Dividend Yield.",
    definition: "Div Yield = Dividend / Price",
    description: "Annual return from dividends.",
    status: getMetricStatus("Dividend Yield", valuationMetrics.dividend_yield),
  },
];

export const buildRiskMetrics = (riskMetrics: RiskMetrics): MetricConfig[] => [
  {
    label: "Volatility (Ann)",
    value: formatPercentage(riskMetrics.annual_volatility),
    criterion: "Annualized Standard Deviation.",
    definition: "Std Dev of returns * sqrt(252).",
    description: "Measure of price variation.",
    status: getMetricStatus("Annual Volatility", riskMetrics.annual_volatility),
  },
  {
    label: "Max Drawdown",
    value: formatPercentage(riskMetrics.max_drawdown),
    criterion: "Max loss from peak.",
    definition: "Peak to trough decline.",
    description: "Deepest drop in the period.",
    status: getMetricStatus("Max Drawdown", riskMetrics.max_drawdown),
  },
  {
    label: "Beta",
    value: riskMetrics.beta?.toFixed(2) || "N/A",
    criterion: "Market sensitivity.",
    definition: "Covariance / Variance of market.",
    description: "Volatility relative to market (1.0).",
    status: getMetricStatus("Beta", riskMetrics.beta),
  },
];