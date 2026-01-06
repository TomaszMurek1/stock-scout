import { useState } from "react";
import { AnimatedTabs, AnimatedTabsContent, AnimatedTabsList, FramerTabTrigger } from "@/components/ui/animated-tabs";
import { LayoutDashboard, TrendingUp, StickyNote } from "lucide-react";
import CompanyOverviewCard from "./parts/company-overview-card";
import TechnicalAnalysisChartCard from "./parts/technical-analysis-card";
import { GrowthChart } from "./parts/growth-chart";
import FinancialTrendsCard from "./parts/financial-trends.card";
import { CompanyNotes } from "./parts/company-notes";

export function StockContentTabs({
  t,
  company_overview,
  technical_analysis,
  risk_metrics,
  shortWindow,
  longWindow,
  isRefreshed,
  financial_trends,
  executive_summary,
  analysis_dashboard,
  currencyCode,
  ticker
}: any) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <AnimatedTabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <AnimatedTabsList className="flex h-auto bg-slate-100/50 p-1">
        <FramerTabTrigger 
            value="overview"
            isSelected={activeTab === "overview"}
            layoutId="stock-tabs"
            className="flex-1"
        >
            <LayoutDashboard className="h-3.5 w-3.5 mr-2" />
            {t("stock_one_pager.tabs.overview")}
        </FramerTabTrigger>
        <FramerTabTrigger 
            value="financials"
            isSelected={activeTab === "financials"}
            layoutId="stock-tabs"
            className="flex-1"
        >
            <TrendingUp className="h-3.5 w-3.5 mr-2" />
            {t("stock_one_pager.tabs.financials")}
        </FramerTabTrigger>
        <FramerTabTrigger 
            value="notes"
            isSelected={activeTab === "notes"}
            layoutId="stock-tabs"
            className="flex-1"
        >
            <StickyNote className="h-3.5 w-3.5 mr-2" />
            {t("stock_one_pager.tabs.notes")}
        </FramerTabTrigger>
      </AnimatedTabsList>
      
      <AnimatedTabsContent value="overview" className="space-y-4">
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
      </AnimatedTabsContent>
      
      <AnimatedTabsContent value="financials" className="space-y-4">
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
      </AnimatedTabsContent>
      
      <AnimatedTabsContent value="notes">
        <CompanyNotes ticker={ticker || ""} />
      </AnimatedTabsContent>
    </AnimatedTabs>
  );
}
