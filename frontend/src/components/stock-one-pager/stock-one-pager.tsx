import { FC } from "react"
import { useParams, useSearchParams } from "react-router-dom"
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
} from "@heroicons/react/24/outline"
import { MetricsCard } from "./metric-card"
import { getMetricStatus } from "./metric-utils"
import { formatPercentage } from "@/utils/formatting"
import LoadingScreen from "../shared/loading-screen"
import ErrorScreen from "../shared/error-screen"
import { useStockData } from "./useStockData"
import StockHeader from "./stock-header"
import CompanyOverviewCard from "./company-overview-card"
import TechnicalAnalysisChartCard from "./technical-analysis-card"
import FinancialTrendsCard from "./financial-trends.card"
import KeyMetricsSummaryCard from "./key-metrics-summary-card"
import TechnicalIndicatorsCard from "./technical-indicators-card"
import TradePanel from "./trade-panel"

export const StockOnePager: FC = () => {
  const { ticker } = useParams();
  const [searchParams] = useSearchParams();

  const shortWindow = Number(searchParams.get("short_window") ?? 50);
  const longWindow = Number(searchParams.get("long_window") ?? 200);
  const { stock, isLoading, error } = useStockData(
    ticker,
    shortWindow,
    longWindow
  );

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
  } = stock;
  console.log('q', financial_performance?.shares_outstanding)
  return (
    <div className="min-h-screen bg-gray-300">
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <StockHeader
          ticker={ticker}
          executiveSummary={executive_summary}
          companyOverview={company_overview}
          technicalAnalysis={technical_analysis}
          riskMetrics={risk_metrics}
          sharesOutstanding={financial_performance?.shares_outstanding}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <CompanyOverviewCard description={company_overview?.description} />
            <TechnicalAnalysisChartCard
              technicalAnalysis={technical_analysis}
              executiveSummary={executive_summary}
              riskMetrics={risk_metrics}
              shortWindow={shortWindow}
              longWindow={longWindow}
            />
            <FinancialTrendsCard
              financialTrends={financial_trends}
              currency={executive_summary?.currency}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <KeyMetricsSummaryCard
              valuationMetrics={valuation_metrics}
              investorMetrics={investor_metrics}
              financialPerformance={financial_performance}
            />

            {/* Existing MetricsCards can be used as-is */}
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
                  status: getMetricStatus("Operating Margin", financial_performance.operating_margin),
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