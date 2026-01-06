import { FC, memo } from "react";
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
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid grid-cols-3 h-auto bg-slate-100/50 p-1">
              <TabsTrigger 
                value="overview"
                className="text-xs py-2 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="financials"
                className="text-xs py-2 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
              >
                Financials
              </TabsTrigger>
              <TabsTrigger 
                value="notes"
                className="text-xs py-2 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
              >
                Notes
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <div className="space-y-6">
                <CompanyOverviewCard 
                  description={company_overview?.description} 
                  isRefreshed={isRefreshed}
                />
                <TechnicalAnalysisChartCard
                  technicalAnalysis={technical_analysis}
                  riskMetrics={risk_metrics}
                  shortWindow={shortWindow}
                  longWindow={longWindow}
                  isRefreshed={isRefreshed}
                />
              </div>
            </TabsContent>
            <TabsContent value="financials" className="space-y-4">
              <div className="space-y-6">
                {analysis_dashboard && (
                  <GrowthChart 
                    trends={financial_trends} 
                    currency={currencyCode} 
                    isRefreshed={isRefreshed}
                  />
                )}

                <FinancialTrendsCard
                  financialTrends={financial_trends}
                  currency={executive_summary?.currency}
                  isRefreshed={isRefreshed}
                />
              </div>
            </TabsContent>
            <TabsContent value="notes">
              <CompanyNotes ticker={ticker || ""} />
            </TabsContent>
          </Tabs>
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
