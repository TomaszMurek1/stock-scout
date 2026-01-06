import { formatCurrency, formatNumber, formatPercentage } from "@/utils/formatting";
import { TFunction } from "i18next";
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
  t: TFunction,
  analysisDashboard: AnalysisDashboard,
  financialPerformance: FinancialPerformance
): MetricConfig[] => [
  (() => {
    const meets = meetsThreshold(analysisDashboard.return_on_assets, 0.15);
    return {
      id: "roa",
      label: t("stock_one_pager.metrics.roa.label"),
      value: formatPercentage(analysisDashboard.return_on_assets),
      criterion: t("stock_one_pager.metrics.roa.criterion"),
      definition: t("stock_one_pager.metrics.roa.definition"),
      description: t("stock_one_pager.metrics.roa.description"),
      meets,
      status: statusFromMeets(meets),
    };
  })(),
  (() => {
    const meets = meetsThreshold(analysisDashboard.return_on_invested_capital, 0.15);
    return {
      id: "roic",
      label: t("stock_one_pager.metrics.roic.label"),
      value: formatPercentage(analysisDashboard.return_on_invested_capital),
      criterion: t("stock_one_pager.metrics.roic.criterion"),
      definition: t("stock_one_pager.metrics.roic.definition"),
      description: t("stock_one_pager.metrics.roic.description"),
      meets,
      status: statusFromMeets(meets),
    };
  })(),
  (() => {
    const meets = meetsThreshold(financialPerformance.operating_margin, 0.2);
    return {
      id: "operating_margin",
      label: t("stock_one_pager.metrics.operating_margin.label"),
      value: formatPercentage(financialPerformance.operating_margin),
      criterion: t("stock_one_pager.metrics.operating_margin.criterion"),
      definition: t("stock_one_pager.metrics.operating_margin.definition"),
      description: t("stock_one_pager.metrics.operating_margin.description"),
      meets,
      status: statusFromMeets(meets),
    };
  })(),
  (() => {
    const meets = meetsThreshold(analysisDashboard.forecast_revenue_growth_rate, 0.05);
    return {
      id: "revenue_cagr_2y",
      label: t("stock_one_pager.metrics.revenue_cagr_2y.label"),
      value: formatPercentage(analysisDashboard.forecast_revenue_growth_rate),
      criterion: t("stock_one_pager.metrics.revenue_cagr_2y.criterion"),
      definition: t("stock_one_pager.metrics.revenue_cagr_2y.definition"),
      description: t("stock_one_pager.metrics.revenue_cagr_2y.description"),
      meets,
      status: statusFromMeets(meets),
    };
  })(),
];

export const buildSafetyMetrics = (t: TFunction, analysisDashboard: AnalysisDashboard): MetricConfig[] => {
  const currentRatioValue = formatNumber(analysisDashboard.current_ratio, 2);
  const currentRatioMeets = meetsThreshold(analysisDashboard.current_ratio, 1);
  const debtToAssetsMeets = meetsThreshold(analysisDashboard.debt_to_assets, 0.4, true);
  const interestCoverageFormatted = formatNumber(analysisDashboard.interest_coverage, 2);
  const interestCoverageMeets = meetsThreshold(analysisDashboard.interest_coverage, 3);
  const ohlsonMeets = meetsThreshold(analysisDashboard.ohlson_indicator_score, 0.02, true);

  return [
    {
      id: "current_ratio",
      label: t("stock_one_pager.metrics.current_ratio.label"),
      value: `${currentRatioValue}x`,
      criterion: t("stock_one_pager.metrics.current_ratio.criterion"),
      description: t("stock_one_pager.metrics.current_ratio.description"),
      definition: t("stock_one_pager.metrics.current_ratio.definition"),
      meets: currentRatioMeets,
      status: statusFromMeets(currentRatioMeets),
    },
    {
      id: "debt_to_assets",
      label: t("stock_one_pager.metrics.debt_to_assets.label"),
      value: formatPercentage(analysisDashboard.debt_to_assets),
      criterion: t("stock_one_pager.metrics.debt_to_assets.criterion"),
      description: t("stock_one_pager.metrics.debt_to_assets.description"),
      definition: t("stock_one_pager.metrics.debt_to_assets.definition"),
      meets: debtToAssetsMeets,
      status: statusFromMeets(debtToAssetsMeets),
    },
    {
      id: "interest_coverage",
      label: t("stock_one_pager.metrics.interest_coverage.label"),
      value: `${interestCoverageFormatted}x`,
      criterion: t("stock_one_pager.metrics.interest_coverage.criterion"),
      description: t("stock_one_pager.metrics.interest_coverage.description"),
      definition: t("stock_one_pager.metrics.interest_coverage.definition"),
      meets: interestCoverageMeets,
      status: statusFromMeets(interestCoverageMeets),
    },
    {
      id: "ohlson_score",
      label: t("stock_one_pager.metrics.ohlson_score.label"),
      value: formatPercentage(analysisDashboard.ohlson_indicator_score),
      criterion: t("stock_one_pager.metrics.ohlson_score.criterion"),
      description: t("stock_one_pager.metrics.ohlson_score.description"),
      definition: t("stock_one_pager.metrics.ohlson_score.definition"),
      meets: ohlsonMeets,
      status: statusFromMeets(ohlsonMeets),
    },
  ];
};

export const buildValuationTimingMetrics = (
  t: TFunction,
  analysisDashboard: AnalysisDashboard,
  currencyCode: string
): MetricConfig[] => {
  const meets = meetsThreshold(analysisDashboard.upside, 0.1);
  return [
    {
      id: "upside_potential",
      label: t("stock_one_pager.metrics.upside_potential.label"),
      value: formatPercentage(analysisDashboard.upside),
      criterion: t("stock_one_pager.metrics.upside_potential.criterion"),
      definition: t("stock_one_pager.metrics.upside_potential.definition"),
      description: t("stock_one_pager.metrics.upside_potential.description"),
      meets,
      status: statusFromMeets(meets),
    },
    {
      id: "analyst_target",
      label: t("stock_one_pager.metrics.analyst_target.label"),
      value: formatCurrency({
        value: analysisDashboard.analyst_price_target,
        currency: currencyCode,
        notation: "compact",
      }),
      criterion: t("stock_one_pager.metrics.analyst_target.criterion"),
      definition: t("stock_one_pager.metrics.analyst_target.definition"),
      description: t("stock_one_pager.metrics.analyst_target.description"),
      status: "neutral" as MetricStatus,
    },
  ];
};

export const buildValuationMetrics = (t: TFunction, valuationMetrics: ValuationMetrics): MetricConfig[] => [
  {
    id: "pe_ratio",
    label: t("stock_one_pager.metrics.pe_ratio.label"),
    value: valuationMetrics.pe_ratio?.toFixed(2) || "N/A",
    criterion: t("stock_one_pager.metrics.pe_ratio.criterion"),
    definition: t("stock_one_pager.metrics.pe_ratio.definition"),
    description: t("stock_one_pager.metrics.pe_ratio.description"),
    status: getMetricStatus("P/E Ratio", valuationMetrics.pe_ratio),
  },
  {
    id: "ev_ebitda",
    label: t("stock_one_pager.metrics.ev_ebitda.label"),
    value: valuationMetrics.ev_ebitda?.toFixed(2) || "N/A",
    criterion: t("stock_one_pager.metrics.ev_ebitda.criterion"),
    definition: t("stock_one_pager.metrics.ev_ebitda.definition"),
    description: t("stock_one_pager.metrics.ev_ebitda.description"),
    status: getMetricStatus("EV/EBITDA", valuationMetrics.ev_ebitda),
  },
  {
    id: "dividend_yield",
    label: t("stock_one_pager.metrics.dividend_yield.label"),
    value: valuationMetrics.dividend_yield
      ? formatPercentage(valuationMetrics.dividend_yield)
      : "N/A",
    criterion: t("stock_one_pager.metrics.dividend_yield.criterion"),
    definition: t("stock_one_pager.metrics.dividend_yield.definition"),
    description: t("stock_one_pager.metrics.dividend_yield.description"),
    status: getMetricStatus("Dividend Yield", valuationMetrics.dividend_yield),
  },
];

export const buildRiskMetrics = (t: TFunction, riskMetrics: RiskMetrics): MetricConfig[] => [
  {
    id: "volatility",
    label: t("stock_one_pager.metrics.volatility.label"),
    value: formatPercentage(riskMetrics.annual_volatility),
    criterion: t("stock_one_pager.metrics.volatility.criterion"),
    definition: t("stock_one_pager.metrics.volatility.definition"),
    description: t("stock_one_pager.metrics.volatility.description"),
    status: getMetricStatus("Annual Volatility", riskMetrics.annual_volatility),
  },
  {
    id: "max_drawdown",
    label: t("stock_one_pager.metrics.max_drawdown.label"),
    value: formatPercentage(riskMetrics.max_drawdown),
    criterion: t("stock_one_pager.metrics.max_drawdown.criterion"),
    definition: t("stock_one_pager.metrics.max_drawdown.definition"),
    description: t("stock_one_pager.metrics.max_drawdown.description"),
    status: getMetricStatus("Max Drawdown", riskMetrics.max_drawdown),
  },
  {
    id: "beta",
    label: t("stock_one_pager.metrics.beta.label"),
    value: riskMetrics.beta?.toFixed(2) || "N/A",
    criterion: t("stock_one_pager.metrics.beta.criterion"),
    definition: t("stock_one_pager.metrics.beta.definition"),
    description: t("stock_one_pager.metrics.beta.description"),
    status: getMetricStatus("Beta", riskMetrics.beta),
  },
];