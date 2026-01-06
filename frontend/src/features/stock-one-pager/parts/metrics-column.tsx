import React from "react";
import { useTranslation } from "react-i18next";
import { MetricTooltipContent } from "../components/metric-tooltip-content";
import { formatCurrency, formatNumber, formatPercentage } from "@/utils/formatting";
import { 
  buildProfitabilityGrowthMetrics, 
  buildSafetyMetrics,
  buildValuationTimingMetrics,
  buildValuationMetrics,
  buildRiskMetrics,
} from "../utils/metric-utils";
import { 
  AnalysisDashboard, 
  ValuationMetrics, 
  FinancialPerformance, 
  RiskMetrics, 
  MetricConfig 
} from "../stock-one-pager.types";
import { MetricGroupCard } from "../components/metric-group-card";

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

interface MetricsColumnProps {
  analysisDashboard?: AnalysisDashboard;
  currencyCode: string;
  valuationMetrics: ValuationMetrics;
  financialPerformance: FinancialPerformance;
  riskMetrics: RiskMetrics;
  isRefreshed?: boolean;
}

export const MetricsColumn: React.FC<MetricsColumnProps> = ({
  analysisDashboard,
  currencyCode,
  valuationMetrics,
  financialPerformance,
  riskMetrics,
  isRefreshed = false,
}) => {
  const { t } = useTranslation();

  const safetyMetrics = analysisDashboard 
    ? buildSafetyMetrics(t, analysisDashboard).map((m: MetricConfig) => {
        if (m.id === "current_ratio") return { ...m, icon: <Icons.Shield /> };
        if (m.id === "debt_to_assets") return { ...m, icon: <Icons.Scale /> };
        if (m.id === "interest_coverage") return { ...m, icon: <Icons.ChartBar /> };
        if (m.id === "ohlson_score") return { ...m, icon: <Icons.Shield /> };
        return m;
      })
    : [];

  const valuationTimingMetrics = analysisDashboard
    ? buildValuationTimingMetrics(t, analysisDashboard, currencyCode).map((m: MetricConfig) => {
        if (m.id === "upside_potential") return { ...m, icon: <Icons.TrendingUp /> };
        if (m.id === "analyst_target") return { ...m, icon: <Icons.Dollar /> };
        return m;
      })
    : [];

  const profitabilityMetrics = analysisDashboard
    ? buildProfitabilityGrowthMetrics(t, analysisDashboard, financialPerformance).map((m: MetricConfig) => {
        if (m.id === "roa") return { ...m, icon: <Icons.TrendingUp /> };
        if (m.id === "roic") return { ...m, icon: <Icons.Cog /> };
        if (m.id === "operating_margin") return { ...m, icon: <Icons.Pie /> };
        if (m.id === "revenue_cagr_2y") return { ...m, icon: <Icons.TrendingUp /> };
        return m;
      })
    : [];

  const valuationList = buildValuationMetrics(t, valuationMetrics).map((m: MetricConfig) => {
    if (m.id === "pe_ratio") return { ...m, icon: <Icons.Scale /> };
    if (m.id === "ev_ebitda") return { ...m, icon: <Icons.Dollar /> };
    if (m.id === "dividend_yield") return { ...m, icon: <Icons.Banknote /> };
    return m;
  });

  const riskList = buildRiskMetrics(t, riskMetrics).map((m: MetricConfig) => {
    if (m.id === "volatility") return { ...m, icon: <Icons.Shield /> };
    if (m.id === "max_drawdown") return { ...m, icon: <Icons.TrendingDown /> };
    if (m.id === "beta") return { ...m, icon: <Icons.ChartBar /> };
    return m;
  });

  return (
    <div className="space-y-6">
      {analysisDashboard && (
        <>
          <MetricGroupCard
            title={t("stock_one_pager.metric_groups.safety_filters")}
            titleIcon={<Icons.Shield />}
            metrics={safetyMetrics}
            isRefreshed={isRefreshed}
          />
          <MetricGroupCard
            title={t("stock_one_pager.metric_groups.valuation_timing")}
            titleIcon={<Icons.Scale />}
            metrics={valuationTimingMetrics}
            isRefreshed={isRefreshed}
          />
          <MetricGroupCard
            title={t("stock_one_pager.metric_groups.profitability_growth")}
            titleIcon={<Icons.TrendingUp />}
            metrics={profitabilityMetrics}
            isRefreshed={isRefreshed}
          />
        </>
      )}
      <MetricGroupCard 
        title={t("stock_one_pager.metric_groups.valuation_ratios")} 
        titleIcon={<Icons.Scale />} 
        metrics={valuationList} 
        isRefreshed={isRefreshed}
      />
      <MetricGroupCard 
        title={t("stock_one_pager.metric_groups.risk_analysis")} 
        titleIcon={<Icons.Shield />} 
        metrics={riskList} 
        isRefreshed={isRefreshed}
      />
    </div>
  );
};
