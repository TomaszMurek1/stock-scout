import { FC } from "react";
import { useParams, useSearchParams } from "react-router-dom";
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
import { GrowthChart } from "./growth-chart";
import { MetricsColumn } from "./metrics-column";

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

            <MetricsColumn
              analysisDashboard={analysis_dashboard}
              currencyCode={currencyCode}
              valuationMetrics={valuation_metrics}
              financialPerformance={financial_performance}
              investorMetrics={investor_metrics}
              riskMetrics={risk_metrics}
            />

            <TechnicalIndicatorsCard technicalAnalysis={technical_analysis} />
            {/* TODO: Placeholder, not working yet */}
            <TradePanel companyId={1} currentPrice={10} />
          </div>
        </div>
      </div>
    </div>
  );
};
