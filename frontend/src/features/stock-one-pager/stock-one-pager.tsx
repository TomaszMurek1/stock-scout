import { FC, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyNotes } from "./company-notes";
import LoadingScreen from "@/components/shared/loading-screen";
import ErrorScreen from "@/components/shared/error-screen";

export const StockOnePager: FC = () => {
  const { ticker } = useParams();
  const [searchParams] = useSearchParams();
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [tradeAction, setTradeAction] = useState<"buy" | "sell">("buy");

  const shortWindow = Number(searchParams.get("short_window") ?? 50);
  const longWindow = Number(searchParams.get("long_window") ?? 200);
  const { stock, isLoading, error } = useStockData(ticker, shortWindow, longWindow);

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={new Error(error)} />;
  if (!stock) return null;
  if (stock.delisted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg max-w-xl w-full p-8 text-center space-y-3">
          <p className="text-2xl font-semibold text-gray-900">{ticker} is delisted</p>
          <p className="text-gray-600">
            {stock.message || "This ticker is marked as delisted. No market data is available."}
          </p>
        </div>
      </div>
    );
  }

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
  const latestPrice =
    technical_analysis.historical.length > 0
      ? technical_analysis.historical[technical_analysis.historical.length - 1].close
      : 0;

  const openBuyModal = () => {
    setTradeAction("buy");
    setIsTradeModalOpen(true);
  };

  const openSellModal = () => {
    setTradeAction("sell");
    setIsTradeModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 text-slate-900">
      <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-8">
        <StockHeader
          ticker={ticker}
          executiveSummary={executive_summary}
          companyOverview={company_overview}
          technicalAnalysis={technical_analysis}
          sharesOutstanding={financial_performance?.shares_outstanding}
          onBuyClick={openBuyModal}
          onSellClick={openSellModal}
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
                  <CompanyOverviewCard description={company_overview?.description} />
                  <TechnicalAnalysisChartCard
                    technicalAnalysis={technical_analysis}
                    riskMetrics={risk_metrics}
                    shortWindow={shortWindow}
                    longWindow={longWindow}
                  />
                </div>
              </TabsContent>
              <TabsContent value="financials" className="space-y-4">
                <div className="space-y-6">
                  {analysis_dashboard && (
                    <GrowthChart trends={financial_trends} currency={currencyCode} />
                  )}

                  <FinancialTrendsCard
                    financialTrends={financial_trends}
                    currency={executive_summary?.currency}
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
            />

            <MetricsColumn
              analysisDashboard={analysis_dashboard}
              currencyCode={currencyCode}
              valuationMetrics={valuation_metrics}
              financialPerformance={financial_performance}
              riskMetrics={risk_metrics}
            />

            <TechnicalIndicatorsCard technicalAnalysis={technical_analysis} />
          </div>
        </div>
      </div>

      <Dialog open={isTradeModalOpen} onOpenChange={setIsTradeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tradeAction === "buy" ? "Buy" : "Sell"} {ticker}
            </DialogTitle>
            <DialogDescription>
              You are about to {tradeAction} shares of {executive_summary.name}.
            </DialogDescription>
          </DialogHeader>
          <TradePanel
            companyId={company_overview.id}
            currentPrice={latestPrice}
            action={tradeAction}
            onTrade={() => setIsTradeModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
