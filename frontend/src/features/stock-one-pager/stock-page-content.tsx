import { FC, memo } from "react";
import { useTranslation } from "react-i18next";
import { StockData } from "./stock-one-pager.types";
import StockHeader from "./parts/stock-header";
import CompanyOverviewCard from "./parts/company-overview-card";
import TechnicalAnalysisChartCard from "./parts/technical-analysis-card";
import FinancialTrendsCard from "./parts/financial-trends.card";
import KeyMetricsSummaryCard from "./parts/key-metrics-summary-card";
import TechnicalIndicatorsCard from "./parts/technical-indicators-card";
import { GrowthChart } from "./parts/growth-chart";
import { MetricsColumn } from "./parts/metrics-column";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyNotes } from "./parts/company-notes";
import { StockContentTabs } from "./stock-content-tabs";

interface StockPageContentProps {
  stock: StockData;
  ticker: string | undefined;
  shortWindow: number;
  longWindow: number;
  isRefreshed: boolean;
  onBuyClick: () => void;
  onSellClick: () => void;
}

const StockPageContentComponent: FC<StockPageContentProps> = ({
  stock,
  ticker,
  shortWindow,
  longWindow,
  isRefreshed,
  onBuyClick,
  onSellClick,
}) => {
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

  const { t } = useTranslation();

  const currencyCode = executive_summary?.currency ?? "USD";

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-8">
      <StockHeader
        ticker={ticker}
        executiveSummary={executive_summary}
        companyOverview={company_overview}
        technicalAnalysis={technical_analysis}
        sharesOutstanding={financial_performance?.shares_outstanding}
        onBuyClick={onBuyClick}
        onSellClick={onSellClick}
        isRefreshed={isRefreshed}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-6">
            <StockContentTabs 
                 t={t} 
                 company_overview={company_overview}
                 technical_analysis={technical_analysis}
                 risk_metrics={risk_metrics}
                 shortWindow={shortWindow}
                 longWindow={longWindow}
                 isRefreshed={isRefreshed}
                 financial_trends={financial_trends}
                 executive_summary={executive_summary}
                 analysis_dashboard={analysis_dashboard}
                 currencyCode={currencyCode}
                 ticker={ticker}
            />
          </div>
        </div>

        <div className="space-y-6">
          <KeyMetricsSummaryCard
            valuationMetrics={valuation_metrics}
            investorMetrics={investor_metrics}
            financialPerformance={financial_performance}
            isRefreshed={isRefreshed}
          />

          <MetricsColumn
            analysisDashboard={analysis_dashboard}
            currencyCode={currencyCode}
            valuationMetrics={valuation_metrics}
            financialPerformance={financial_performance}
            riskMetrics={risk_metrics}
            isRefreshed={isRefreshed}
          />

          <TechnicalIndicatorsCard 
            technicalAnalysis={technical_analysis} 
            isRefreshed={isRefreshed}
          />
        </div>
      </div>
    </div>
  );
};

export const StockPageContent = memo(StockPageContentComponent);
