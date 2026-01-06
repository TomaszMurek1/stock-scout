"use client";

import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "./parts/Header";
import Summary from "./parts/summary/Summary";
import Performance from "./parts/performance/Performance";
import AddStockModal from "./modals/add-stock/AddStockModal";
import { usePortfolioBaseData } from "./hooks/usePortfolioBaseData";
import { usePortfolioTotals } from "./hooks/usePortfolioTotals";
import PortfolioTabs from "./tabs/PortfolioTabs";
import { AnimatedTabs, AnimatedTabsContent, AnimatedTabsList, FramerTabTrigger } from "@/components/ui/animated-tabs";
import { Period } from "./types";
import { useTranslation } from "react-i18next";


export default function PortfolioManagement() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"portfolio" | "performance">("portfolio");
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("ytd");
  const location = useLocation();
  const tabsRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (location.state && (location.state as any).activeTab) {
        // If navigating to alerts, we want top level 'portfolio' and sub-tab 'alerts'
        if ((location.state as any).activeTab === 'alerts') {
             setActiveTab('portfolio');
             setActiveSubTab('alerts');
        } else {
             setActiveTab((location.state as any).activeTab);
        }
        
        if ((location.state as any).scrollToTabs && tabsRef.current) {
            tabsRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }
  }, [location.state]);

  const { portfolio, holdings, transactions, performance, refreshPortfolio, sell, isLoading } =
    usePortfolioBaseData();

  const totals = usePortfolioTotals({
    performance,
    holdings,
    portfolio,
  });

  const hasFetched = useRef(false);

  useEffect(() => {
    if (!hasFetched.current) {
        refreshPortfolio();
        hasFetched.current = true;
    }
  }, [refreshPortfolio]);

  useEffect(() => {
    refreshPortfolio();
  }, [refreshPortfolio]);

  if (!portfolio || !totals) return <div>No portfolio found</div>;

  const handleAddSuccess = () => {
    setIsAddModalOpen(false);
    refreshPortfolio();
  };

  return (
    <div className="min-h-screen bg-gray-100 text-slate-900">
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        {/* Main Card Container - wraps header and all content */}
        <div className="p-6 rounded-xl bg-gray-100  space-y-6">
          <Header onAdd={() => setIsAddModalOpen(true)} />

          <AnimatedTabs
            defaultValue="portfolio"
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as "portfolio" | "performance")}
            className="space-y-6"
            ref={tabsRef}
          >
            <AnimatedTabsList className="bg-slate-100/50 p-1 h-auto flex overflow-x-auto no-scrollbar gap-1 w-full sm:w-auto justify-start">
              <FramerTabTrigger
                value="portfolio"
                isSelected={activeTab === "portfolio"}
                className="px-6 py-2"
              >
                {t("portfolio.tabs.portfolio")}
              </FramerTabTrigger>
              <FramerTabTrigger
                value="performance"
                isSelected={activeTab === "performance"}
                className="px-6 py-2"
              >
                {t("portfolio.tabs.performance")}
              </FramerTabTrigger>
            </AnimatedTabsList>

            <AnimatedTabsContent value="portfolio" forceMount={true} className="space-y-6 animate-in fade-in-0 mt-0">
              <Summary
                portfolio={portfolio}
                accounts={portfolio.accounts || []} 
                performance={performance}
                holdings={holdings}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
                isLoading={isLoading}
              />
              <PortfolioTabs
                onRemove={sell}
                byHolding={totals.byHolding}
                transactions={transactions}
                isLoading={isLoading}
                selectedPeriod={selectedPeriod}
                externalTab={activeSubTab}
                accounts={portfolio.accounts || []}
                portfolioCurrency={portfolio.currency}
              />
            </AnimatedTabsContent>

            <AnimatedTabsContent value="performance" forceMount={true} className="space-y-6 animate-in fade-in-0 mt-0">
              <Performance />
            </AnimatedTabsContent>
          </AnimatedTabs>
        </div>

        <AddStockModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddSuccess}
        />
      </div>
    </div>
  );
}
