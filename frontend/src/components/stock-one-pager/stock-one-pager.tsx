import { FC } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ScaleIcon,
  ShieldExclamationIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  BanknotesIcon,
  ChartPieIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { MetricsCard } from "./metric-card";
import { getMetricStatus } from "./metric-utils";
import { formatCurrency, formatNumber, formatPercentage } from "@/utils/formatting";
import LoadingScreen from "../shared/loading-screen";
import ErrorScreen from "../shared/error-screen";
import { useStockData } from "./useStockData";
import StockHeader from "./stock-header";
import CompanyOverviewCard from "./company-overview-card";
import TechnicalAnalysisChartCard from "./technical-analysis-card";
import FinancialTrendsCard from "./financial-trends.card";
import KeyMetricsSummaryCard from "./key-metrics-summary-card";
import TechnicalIndicatorsCard from "./technical-indicators-card";
import TradePanel from "./trade-panel";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
} from "recharts";
import type { FinancialTrends } from "./stock-one-pager.types";

const formatCompactCurrencyValue = (value: number | null | undefined, currency?: string | null) =>
  formatCurrency({
    value,
    currency: currency ?? "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  });

const meetsThreshold = (value: number | null | undefined, threshold: number, invert = false) => {
  if (value == null) return undefined;
  return invert ? value <= threshold : value >= threshold;
};

const statusFromMeets = (meets?: boolean) =>
  meets === undefined ? undefined : meets ? "good" : "bad";

export const StockOnePager: FC = () => {
  const { ticker } = useParams();
  const [searchParams] = useSearchParams();

  const shortWindow = Number(searchParams.get("short_window") ?? 50);
  const longWindow = Number(searchParams.get("long_window") ?? 200);
  const { stock, isLoading, error } = useStockData(ticker, shortWindow, longWindow);

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;
  if (!stock) return null;

  const {
    executive_summary,
    company_overview,
    financial_performance,
    investor_metrics,
    valuation_metrics,
    risk_metrics,
    financial_trends,
    technical_analysis,
    analysis_dashboard,
  } = stock;

  const currencyCode = executive_summary?.currency ?? "USD";

  const profitabilityGrowthMetrics = analysis_dashboard
    ? [
        (() => {
          const meets = meetsThreshold(analysis_dashboard.return_on_assets, 0.15);
          return {
            label: "ROA = Net Income / Total Assets",
            value: formatPercentage(analysis_dashboard.return_on_assets),
            tooltip: "ROA (≥15%)",
            meets,
            status: statusFromMeets(meets),
            icon: <ArrowTrendingUpIcon className="h-8 w-8" />,
          };
        })(),
        (() => {
          const meets = meetsThreshold(analysis_dashboard.return_on_invested_capital, 0.15);
          return {
            label: "ROIC = Operating Income / (Debt + Equity)",
            value: formatPercentage(analysis_dashboard.return_on_invested_capital),
            tooltip: "ROIC (≥15%)",
            meets,
            status: statusFromMeets(meets),
            icon: <Cog6ToothIcon className="h-8 w-8" />,
          };
        })(),
        (() => {
          const meets = meetsThreshold(financial_performance.operating_margin, 0.2);
          return {
            label: "Operating Margin = Operating Income / Revenue",
            value: formatPercentage(financial_performance.operating_margin),
            tooltip: "Operating Margin (≥20%)",
            meets,
            status: statusFromMeets(meets),
            icon: <ChartPieIcon className="h-8 w-8" />,
          };
        })(),
        (() => {
          const meets = meetsThreshold(analysis_dashboard.forecast_revenue_growth_rate, 0.05);
          return {
            label: "Revenue CAGR (2Y)",
            value: formatPercentage(analysis_dashboard.forecast_revenue_growth_rate),
            tooltip: "Revenue CAGR 2Y (≥5%)",
            meets,
            status: statusFromMeets(meets),
            icon: <ArrowTrendingUpIcon className="h-8 w-8" />,
          };
        })(),
        (() => {
          const meets = meetsThreshold(analysis_dashboard.forecast_eps_growth_rate_long, 0.1);
          return {
            label: "EPS CAGR (5Y)",
            value: formatPercentage(analysis_dashboard.forecast_eps_growth_rate_long),
            tooltip: "EPS CAGR 5Y (≥10%)",
            meets,
            status: statusFromMeets(meets),
            icon: <ArrowTrendingUpIcon className="h-8 w-8" />,
          };
        })(),
        {
          label: "Operating Cash Flow (ttm)",
          value: formatCompactCurrencyValue(analysis_dashboard.operating_cash_flow, currencyCode),
          tooltip: "Operating Cash Flow (compact)",
          icon: <BanknotesIcon className="h-8 w-8" />,
        },
        {
          label: "Forecast Revision Direction",
          value: analysis_dashboard.forecast_revision_direction || "N/A",
          tooltip: "Direction of analyst EPS revisions (Up/Down)",
          icon: <ChartBarIcon className="h-8 w-8" />,
        },
      ]
    : [];

  const safetyMetrics = analysis_dashboard
    ? [
        (() => {
          const meets = meetsThreshold(analysis_dashboard.current_ratio, 1);
          const formatted = formatNumber(analysis_dashboard.current_ratio, 2);
          return {
            label: "Current Ratio = Current Assets / Current Liabilities",
            value: formatted === "N/A" ? formatted : `${formatted}x`,
            tooltip: "Current Ratio (>1.0)",
            meets,
            status: statusFromMeets(meets),
            icon: <ShieldExclamationIcon className="h-8 w-8" />,
          };
        })(),
        (() => {
          const meets = meetsThreshold(analysis_dashboard.debt_to_assets, 0.4, true);
          return {
            label: "Debt to Assets = Total Debt / Total Assets",
            value: formatPercentage(analysis_dashboard.debt_to_assets),
            tooltip: "Debt to Assets (<40%)",
            meets,
            status: statusFromMeets(meets),
            icon: <ScaleIcon className="h-8 w-8" />,
          };
        })(),
        (() => {
          const meets = meetsThreshold(analysis_dashboard.interest_coverage, 3);
          const formatted = formatNumber(analysis_dashboard.interest_coverage, 2);
          return {
            label: "Interest Coverage = Operating Income / Interest Expense",
            value: formatted === "N/A" ? formatted : `${formatted}x`,
            tooltip: "Interest Coverage (>3x)",
            meets,
            status: statusFromMeets(meets),
            icon: <ChartBarIcon className="h-8 w-8" />,
          };
        })(),
        (() => {
          const meets = meetsThreshold(analysis_dashboard.cfo_to_total_debt, 0.3);
          return {
            label: "CFO / Debt = Operating Cash Flow / Total Debt",
            value: formatPercentage(analysis_dashboard.cfo_to_total_debt),
            tooltip: "CFO / Debt (>30%)",
            meets,
            status: statusFromMeets(meets),
            icon: <BanknotesIcon className="h-8 w-8" />,
          };
        })(),
        (() => {
          const change = analysis_dashboard.total_debt_trend?.change ?? null;
          const meets = meetsThreshold(change, 0, true);
          const debtChange = formatCompactCurrencyValue(change, currencyCode);
          const direction = analysis_dashboard.total_debt_trend?.direction;
          return {
            label: "Debt Trend = Δ Total Debt vs prior period",
            value: direction ? `${direction} ${debtChange}` : debtChange,
            tooltip: "Debt Trend (prefer ≤ 0)",
            meets,
            status: statusFromMeets(meets),
            icon: <ArrowTrendingDownIcon className="h-8 w-8" />,
          };
        })(),
        (() => {
          const meets = meetsThreshold(analysis_dashboard.ohlson_indicator_score, 0.02, true);
          return {
            label: "Ohlson Score (bankruptcy risk)",
            value: formatPercentage(analysis_dashboard.ohlson_indicator_score),
            tooltip: "Ohlson Score (<2%)",
            meets,
            status: statusFromMeets(meets),
            icon: <ShieldExclamationIcon className="h-8 w-8" />,
          };
        })(),
      ]
    : [];

  const valuationTimingMetrics = analysis_dashboard
    ? [
        (() => {
          const meets = meetsThreshold(analysis_dashboard.upside, 0.1);
          return {
            label: "Upside vs Current Price",
            value: formatPercentage(analysis_dashboard.upside),
            tooltip: "Upside (≥10%)",
            meets,
            status: statusFromMeets(meets),
            icon: <ArrowTrendingUpIcon className="h-8 w-8" />,
          };
        })(),
        {
          label: "Analyst Price Target (mean)",
          value: formatCurrency({
            value: analysis_dashboard.analyst_price_target,
            currency: currencyCode,
            notation: "compact",
            maximumFractionDigits: 1,
          }),
          tooltip: "Consensus analyst price target",
          icon: <CurrencyDollarIcon className="h-8 w-8" />,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-100 text-slate-900">
      <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-8">
        <StockHeader
          ticker={ticker}
          executiveSummary={executive_summary}
          companyOverview={company_overview}
          technicalAnalysis={technical_analysis}
          riskMetrics={risk_metrics}
          sharesOutstanding={financial_performance?.shares_outstanding}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <CompanyOverviewCard description={company_overview?.description} />
            <TechnicalAnalysisChartCard
              technicalAnalysis={technical_analysis}
              executiveSummary={executive_summary}
              riskMetrics={risk_metrics}
              shortWindow={shortWindow}
              longWindow={longWindow}
            />

            {analysis_dashboard && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-3">
                  <GrowthChart trends={financial_trends} currency={currencyCode} />
                </div>
              </div>
            )}

            <FinancialTrendsCard
              financialTrends={financial_trends}
              currency={executive_summary?.currency}
            />
          </div>

          <div className="space-y-6">
            <KeyMetricsSummaryCard
              valuationMetrics={valuation_metrics}
              investorMetrics={investor_metrics}
              financialPerformance={financial_performance}
            />

            {analysis_dashboard && (
              <>
                <MetricsCard
                  title="Safety Filters"
                  titleIcon={<ShieldExclamationIcon className="h-5 w-5 text-primary" />}
                  metrics={safetyMetrics}
                />
                <MetricsCard
                  title="Valuation & Timing"
                  titleIcon={<ScaleIcon className="h-5 w-5 text-primary" />}
                  metrics={valuationTimingMetrics}
                />
                <MetricsCard
                  title="Profitability & Growth"
                  titleIcon={<ArrowTrendingUpIcon className="h-5 w-5 text-primary" />}
                  metrics={profitabilityGrowthMetrics}
                />
              </>
            )}

            <MetricsCard
              title="Valuation Metrics"
              titleIcon={<ScaleIcon className="h-5 w-5 text-primary" />}
              metrics={[
                {
                  label: "P/E Ratio",
                  value: valuation_metrics.pe_ratio?.toFixed(2) || "N/A",
                  icon: <ScaleIcon className="h-8 w-8" />,
                  tooltip: "Price to Earnings ratio.",
                  status: getMetricStatus("P/E Ratio", valuation_metrics.pe_ratio),
                },
                {
                  label: "EV/EBITDA",
                  value: valuation_metrics.ev_ebitda?.toFixed(2) || "N/A",
                  icon: <CurrencyDollarIcon className="h-8 w-8" />,
                  tooltip: "Enterprise Value / EBITDA.",
                  status: getMetricStatus("EV/EBITDA", valuation_metrics.ev_ebitda),
                },
                {
                  label: "PEG Ratio",
                  value: valuation_metrics.peg_ratio?.toFixed(2) || "N/A",
                  icon: <ArrowTrendingUpIcon className="h-8 w-8" />,
                  tooltip: "P/E ratio adjusted for growth.",
                  status: getMetricStatus("PEG Ratio", valuation_metrics.peg_ratio),
                },
                {
                  label: "Dividend Yield",
                  value:
                    valuation_metrics.dividend_yield !== null
                      ? formatPercentage(valuation_metrics.dividend_yield)
                      : "N/A",
                  icon: <BanknotesIcon className="h-8 w-8" />,
                  tooltip: "Dividends relative to share price.",
                  status: getMetricStatus("Dividend Yield", valuation_metrics.dividend_yield),
                },
              ]}
            />

            <MetricsCard
              title="Financial Performance"
              titleIcon={<ChartPieIcon className="h-5 w-5 text-primary" />}
              metrics={[
                {
                  label: "Gross Margin",
                  value: formatPercentage(financial_performance.gross_margin),
                  icon: <ChartPieIcon className="h-8 w-8" />,
                  tooltip: "Percentage of revenue remaining after cost of goods sold.",
                  status: getMetricStatus("Gross Margin", financial_performance.gross_margin),
                },
                {
                  label: "Operating Margin",
                  value: formatPercentage(financial_performance.operating_margin),
                  icon: <Cog6ToothIcon className="h-8 w-8" />,
                  tooltip: "Profitability from core operations.",
                  status: getMetricStatus(
                    "Operating Margin",
                    financial_performance.operating_margin
                  ),
                },
                {
                  label: "Net Margin",
                  value: formatPercentage(financial_performance.net_margin),
                  icon: <BanknotesIcon className="h-8 w-8" />,
                  tooltip: "Net income as a percentage of revenue.",
                  status: getMetricStatus("Net Margin", financial_performance.net_margin),
                },
              ]}
            />

            <MetricsCard
              title="Investor Metrics"
              titleIcon={<CurrencyDollarIcon className="h-5 w-5 text-primary" />}
              metrics={[
                {
                  label: "Rule of 40",
                  value: `${investor_metrics.rule_of_40.toFixed(2)}%`,
                  icon: <ScaleIcon className="h-8 w-8" />,
                  tooltip: "Growth + profitability should exceed 40%.",
                  status: getMetricStatus("Rule of 40", investor_metrics.rule_of_40),
                },
                {
                  label: "EBITDA Margin",
                  value: formatPercentage(investor_metrics.ebitda_margin),
                  icon: <CurrencyDollarIcon className="h-8 w-8" />,
                  tooltip: "Earnings before interest & taxes.",
                  status: getMetricStatus("EBITDA Margin", investor_metrics.ebitda_margin),
                },
                {
                  label: "Revenue Growth",
                  value: `${investor_metrics.revenue_growth.toFixed(2)}%`,
                  icon:
                    investor_metrics.revenue_growth >= 0 ? (
                      <ArrowTrendingUpIcon className="h-8 w-8" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-8 w-8" />
                    ),
                  tooltip: "YoY revenue growth.",
                  status: getMetricStatus("Revenue Growth", investor_metrics.revenue_growth / 100),
                },
                {
                  label: "FCF Margin",
                  value: formatPercentage(investor_metrics.fcf_margin),
                  icon: <BanknotesIcon className="h-8 w-8" />,
                  tooltip: "Free cash flow to revenue ratio.",
                  status: getMetricStatus("FCF Margin", investor_metrics.fcf_margin),
                },
              ]}
            />

            <MetricsCard
              title="Risk Metrics"
              titleIcon={<ShieldExclamationIcon className="h-5 w-5 text-primary" />}
              metrics={[
                {
                  label: "Annual Volatility",
                  value: formatPercentage(risk_metrics.annual_volatility),
                  icon: <ShieldExclamationIcon className="h-8 w-8" />,
                  tooltip: "How much the stock price moves over time.",
                  status: getMetricStatus("Annual Volatility", risk_metrics.annual_volatility),
                },
                {
                  label: "Max Drawdown",
                  value: formatPercentage(risk_metrics.max_drawdown),
                  icon: <ArrowTrendingDownIcon className="h-8 w-8" />,
                  tooltip: "Largest observed price drop from a peak.",
                  status: getMetricStatus("Max Drawdown", risk_metrics.max_drawdown),
                },
                {
                  label: "Beta",
                  value: risk_metrics.beta ? risk_metrics.beta.toFixed(2) : "N/A",
                  icon: <ChartBarIcon className="h-8 w-8" />,
                  tooltip: "Stock's sensitivity to market movements.",
                  status: getMetricStatus("Beta", risk_metrics.beta),
                },
              ]}
            />

            <TechnicalIndicatorsCard technicalAnalysis={technical_analysis} />
            {/*TODO: Pleceholder, not working yet */}
            <TradePanel companyId={1} currentPrice={10} />
          </div>
        </div>
      </div>
    </div>
  );
};

const GrowthChart = ({
  trends,
  currency,
}: {
  trends: FinancialTrends;
  currency?: string | null;
}) => {
  const data = (trends?.revenue || [])
    .map((rev, idx) => ({
      year: rev.year,
      revenue: rev.value,
      net_income: trends.net_income?.[idx]?.value,
      fcf: trends.free_cash_flow?.[idx]?.value,
      ebitda: trends.ebitda?.[idx]?.value,
    }))
    .sort((a, b) => a.year - b.year);
  if (!data.length) return <div className="text-slate-300">No history available.</div>;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm text-slate-600">Growth over time</p>
          <p className="text-lg font-semibold text-slate-900">Profitability & Growth Trend</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" stroke="#475569" />
          <YAxis
            stroke="#475569"
            tickFormatter={(v) => formatCompactCurrencyValue(v, currency)}
            width={80}
          />
          <ReTooltip
            labelFormatter={(label) => `Year ${label}`}
            formatter={(value: number, name) => [formatCompactCurrencyValue(value, currency), name]}
            contentStyle={{ background: "#fff", border: "1px solid #cbd5e1", color: "#0f172a" }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            name="Revenue"
          />
          <Line
            type="monotone"
            dataKey="net_income"
            stroke="#16a34a"
            strokeWidth={2}
            dot={false}
            name="Net Income"
          />
          <Line
            type="monotone"
            dataKey="fcf"
            stroke="#7c3aed"
            strokeWidth={2}
            dot={false}
            name="Free Cash Flow"
          />
          <Line
            type="monotone"
            dataKey="ebitda"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            name="EBITDA"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
