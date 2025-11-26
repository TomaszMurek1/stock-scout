import React from "react";
import { Card, Tooltip } from "@/components/ui/Layout";
import { formatCurrency, formatNumber, formatPercentage } from "@/utils/formatting";
import { meetsThreshold, statusFromMeets } from "./metric-helpers";
import { getMetricStatus } from "./metric-utils";
import type {
  AnalysisDashboard,
  FinancialPerformance,
  RiskMetrics,
  ValuationMetrics,
} from "./stock-one-pager.types";

// --- Icons (Inline SVGs for portability) ---
const Icons = {
  TrendingUp: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  ),
  TrendingDown: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
      />
    </svg>
  ),
  Scale: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v8"
      />
    </svg>
  ),
  Shield: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  ),
  Dollar: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  ChartBar: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  Pie: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
      />
    </svg>
  ),
  Banknote: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  ),
  Cog: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
};

// --- Sub-Components ---
const MetricsCard = ({
  title,
  titleIcon,
  metrics,
}: {
  title: string;
  titleIcon: React.ReactNode;
  metrics: any[];
}) => (
  <Card className="mb-6 bg-white shadow-sm border-slate-200">
    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50 rounded-t-lg">
      <span className="text-slate-600">{titleIcon}</span>
      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">{title}</h3>
    </div>
    <div className="p-2">
      {metrics.map((metric, idx) => (
        <div
          key={idx}
          className="group flex items-center justify-between p-2.5 rounded hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
              {metric.icon}
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-slate-700">{metric.label}</span>
                <Tooltip
                  content={
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                          Value
                        </h4>
                        <p className="font-mono text-emerald-400 font-semibold">{metric.value}</p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                          Description
                        </h4>
                        <p className="text-slate-300 text-xs leading-snug">{metric.description}</p>
                      </div>
                      <div className="border-t border-slate-700 pt-2">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                          Formula
                        </h4>
                        <p className="text-slate-400 text-xs italic">{metric.definition}</p>
                      </div>
                      {metric.tooltip && (
                        <div className="border-t border-slate-700 pt-2">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                            Threshold
                          </h4>
                          <p className="text-slate-300 text-xs">{metric.tooltip}</p>
                        </div>
                      )}
                    </div>
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-slate-300 hover:text-blue-500 cursor-help"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </Tooltip>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`text-sm font-bold ${
                metric.status === "success"
                  ? "text-emerald-600"
                  : metric.status === "danger"
                    ? "text-rose-600"
                    : metric.status === "warning"
                      ? "text-amber-600"
                      : "text-slate-900"
              }`}
            >
              {metric.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  </Card>
);

interface MetricsColumnProps {
  analysisDashboard?: AnalysisDashboard;
  currencyCode: string;
  valuationMetrics: ValuationMetrics;
  financialPerformance: FinancialPerformance;
  riskMetrics: RiskMetrics;
}

// --- Data Builders ---

const buildProfitabilityGrowthMetrics = (
  analysisDashboard: AnalysisDashboard,
  financialPerformance: FinancialPerformance
) => [
  (() => {
    const meets = meetsThreshold(analysisDashboard.return_on_assets, 0.15);
    return {
      label: "Return on Assets (ROA)",
      value: formatPercentage(analysisDashboard.return_on_assets),
      tooltip: "ROA (≥15%)",
      definition: "ROA = Net Income / Total Assets",
      description: "How efficiently assets are used to generate profit.",
      meets,
      status: statusFromMeets(meets),
      icon: <Icons.TrendingUp />,
    };
  })(),
  (() => {
    const meets = meetsThreshold(analysisDashboard.return_on_invested_capital, 0.15);
    return {
      label: "ROIC",
      value: formatPercentage(analysisDashboard.return_on_invested_capital),
      tooltip: "ROIC (≥15%)",
      definition: "ROIC = Operating Income / (Debt + Equity)",
      description: "Efficiency of allocated capital.",
      meets,
      status: statusFromMeets(meets),
      icon: <Icons.Cog />,
    };
  })(),
  (() => {
    const meets = meetsThreshold(financialPerformance.operating_margin, 0.2);
    return {
      label: "Operating Margin",
      value: formatPercentage(financialPerformance.operating_margin),
      tooltip: "Operating Margin (≥20%)",
      definition: "Operating Margin = Operating Income / Revenue",
      description: "Profit after core operations costs.",
      meets,
      status: statusFromMeets(meets),
      icon: <Icons.Pie />,
    };
  })(),
  (() => {
    const meets = meetsThreshold(analysisDashboard.forecast_revenue_growth_rate, 0.05);
    return {
      label: "Revenue CAGR (2Y)",
      value: formatPercentage(analysisDashboard.forecast_revenue_growth_rate),
      tooltip: "Revenue CAGR 2Y (≥5%)",
      definition: "Compound annual revenue growth over last 2 years.",
      description: "Average annual revenue growth rate.",
      meets,
      status: statusFromMeets(meets),
      icon: <Icons.TrendingUp />,
    };
  })(),
];

const buildSafetyMetrics = (analysisDashboard: AnalysisDashboard) => {
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
      tooltip: "Current Ratio (>1.0)",
      description: "Ability to pay short-term obligations.",
      definition: "Current Ratio = Current Assets / Current Liabilities",
      meets: currentRatioMeets,
      status: statusFromMeets(currentRatioMeets),
      icon: <Icons.Shield />,
    },
    {
      label: "Debt to Assets",
      value: formatPercentage(analysisDashboard.debt_to_assets),
      tooltip: "Debt to Assets (<40%)",
      description: "Proportion of assets financed by debt.",
      definition: "Debt to Assets = Total Debt / Total Assets",
      meets: debtToAssetsMeets,
      status: statusFromMeets(debtToAssetsMeets),
      icon: <Icons.Scale />,
    },
    {
      label: "Interest Coverage",
      value: `${interestCoverageFormatted}x`,
      tooltip: "Interest Coverage (>3x)",
      description: "Ability to pay interest on outstanding debt.",
      definition: "Interest Coverage = Operating Income / Interest Expense",
      meets: interestCoverageMeets,
      status: statusFromMeets(interestCoverageMeets),
      icon: <Icons.ChartBar />,
    },
    {
      label: "Ohlson Score",
      value: formatPercentage(analysisDashboard.ohlson_indicator_score),
      tooltip: "Ohlson Score (<2%)",
      description: "Probability of bankruptcy.",
      definition: "Ohlson O-Score model.",
      meets: ohlsonMeets,
      status: statusFromMeets(ohlsonMeets),
      icon: <Icons.Shield />,
    },
  ];
};

const buildValuationTimingMetrics = (
  analysisDashboard: AnalysisDashboard,
  currencyCode: string
) => {
  const meets = meetsThreshold(analysisDashboard.upside, 0.1);
  return [
    {
      label: "Upside Potential",
      value: formatPercentage(analysisDashboard.upside),
      tooltip: "Upside (≥10%)",
      definition: "Upside = (Target - Current) / Current",
      description: "Potential gain to analyst target price.",
      meets,
      status: statusFromMeets(meets),
      icon: <Icons.TrendingUp />,
    },
    {
      label: "Analyst Target",
      value: formatCurrency({
        value: analysisDashboard.analyst_price_target,
        currency: currencyCode,
        notation: "compact",
      }),
      tooltip: "Consensus Price Target.",
      definition: "Mean analyst 12-month price target.",
      description: "Average price target from Wall St analysts.",
      icon: <Icons.Dollar />,
      status: "neutral",
    },
  ];
};

const buildValuationMetrics = (valuationMetrics: ValuationMetrics) => [
  {
    label: "P/E Ratio",
    value: valuationMetrics.pe_ratio?.toFixed(2) || "N/A",
    icon: <Icons.Scale />,
    tooltip: "Price to Earnings.",
    definition: "P/E = Price / EPS",
    description: "Price paid for $1 of earnings.",
    status: getMetricStatus("P/E Ratio", valuationMetrics.pe_ratio),
  },
  {
    label: "EV/EBITDA",
    value: valuationMetrics.ev_ebitda?.toFixed(2) || "N/A",
    icon: <Icons.Dollar />,
    tooltip: "EV / EBITDA.",
    definition: "Enterprise Value / EBITDA",
    description: "Capital-structure neutral valuation.",
    status: getMetricStatus("EV/EBITDA", valuationMetrics.ev_ebitda),
  },
  {
    label: "Div Yield",
    value: valuationMetrics.dividend_yield
      ? formatPercentage(valuationMetrics.dividend_yield)
      : "N/A",
    icon: <Icons.Banknote />,
    tooltip: "Dividend Yield.",
    definition: "Div Yield = Dividend / Price",
    description: "Annual return from dividends.",
    status: getMetricStatus("Dividend Yield", valuationMetrics.dividend_yield),
  },
];

const buildRiskMetrics = (riskMetrics: RiskMetrics) => [
  {
    label: "Volatility (Ann)",
    value: formatPercentage(riskMetrics.annual_volatility),
    icon: <Icons.Shield />,
    tooltip: "Annualized Standard Deviation.",
    definition: "Std Dev of returns * sqrt(252).",
    description: "Measure of price variation.",
    status: getMetricStatus("Annual Volatility", riskMetrics.annual_volatility),
  },
  {
    label: "Max Drawdown",
    value: formatPercentage(riskMetrics.max_drawdown),
    icon: <Icons.TrendingDown />,
    tooltip: "Max loss from peak.",
    definition: "Peak to trough decline.",
    description: "Deepest drop in the period.",
    status: getMetricStatus("Max Drawdown", riskMetrics.max_drawdown),
  },
  {
    label: "Beta",
    value: riskMetrics.beta?.toFixed(2) || "N/A",
    icon: <Icons.ChartBar />,
    tooltip: "Market sensitivity.",
    definition: "Covariance / Variance of market.",
    description: "Volatility relative to market (1.0).",
    status: getMetricStatus("Beta", riskMetrics.beta),
  },
];

export const MetricsColumn: React.FC<MetricsColumnProps> = ({
  analysisDashboard,
  currencyCode,
  valuationMetrics,
  financialPerformance,
  riskMetrics,
}) => {
  const safetyMetrics = analysisDashboard
    ? buildSafetyMetrics(analysisDashboard, currencyCode)
    : [];
  const valuationTimingMetrics = analysisDashboard
    ? buildValuationTimingMetrics(analysisDashboard, currencyCode)
    : [];
  const profitabilityMetrics = analysisDashboard
    ? buildProfitabilityGrowthMetrics(analysisDashboard, financialPerformance)
    : [];
  const valuationList = buildValuationMetrics(valuationMetrics);
  const riskList = buildRiskMetrics(riskMetrics);

  return (
    <div className="space-y-6">
      {analysisDashboard && (
        <>
          <MetricsCard
            title="Safety Filters"
            titleIcon={<Icons.Shield />}
            metrics={safetyMetrics}
          />
          <MetricsCard
            title="Valuation & Timing"
            titleIcon={<Icons.Scale />}
            metrics={valuationTimingMetrics}
          />
          <MetricsCard
            title="Profitability & Growth"
            titleIcon={<Icons.TrendingUp />}
            metrics={profitabilityMetrics}
          />
        </>
      )}
      <MetricsCard title="Valuation Ratios" titleIcon={<Icons.Scale />} metrics={valuationList} />
      <MetricsCard title="Risk Analysis" titleIcon={<Icons.Shield />} metrics={riskList} />
    </div>
  );
};
