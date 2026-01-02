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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Period } from "./types";


export default function PortfolioManagement() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"portfolio" | "performance">("portfolio");
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("ytd");
  const location = useLocation();
  const tabsRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    refreshPortfolio();
  }, [refreshPortfolio]);

  // Check if we are in the initial loading state (no valid/real portfolio data yet)
  const isInitialLoad = isLoading && (!portfolio || portfolio.id === 0);

  if (isInitialLoad) {
    return (
      <div className="min-h-screen bg-gray-50 text-slate-900">
        <div className="max-w-[1400px] mx-auto px-4 py-8 space-y-8">
           
           {/* 1. Header Card Skeleton (Matches <Header /> container) */}
           <div className="p-6 rounded-xl bg-white shadow-sm border border-gray-200 flex justify-between items-center animate-pulse">
               <div className="flex gap-4 items-center">
                   <div className="h-12 w-12 bg-gray-100 rounded-full" />
                   <div className="space-y-2">
                       <div className="h-6 w-48 bg-gray-100 rounded" />
                       <div className="h-4 w-32 bg-gray-50 rounded" />
                   </div>
               </div>
               <div className="h-10 w-32 bg-gray-100 rounded-md" />
           </div>

           {/* 2. Tabs List Skeleton (Matches <TabsList />) */}
           <div className="flex gap-2 animate-pulse">
                 <div className="h-10 w-24 bg-white rounded-md border border-gray-200" />
                 <div className="h-10 w-32 bg-gray-100 rounded-md" />
           </div>

           {/* 3. Summary Content Skeleton (Matches <Summary /> internal layout) */}
           <div className="space-y-6 animate-pulse">
                {/* Summary Header */}
                <div className="space-y-1">
                    <div className="h-7 w-48 bg-gray-200 rounded" />
                    <div className="h-4 w-64 bg-gray-100 rounded" />
                </div>

                {/* Metrics Cards (4 cols) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-[116px] flex flex-col justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 bg-gray-50 rounded-lg" />
                                <div className="h-4 w-20 bg-gray-50 rounded" />
                            </div>
                            <div className="h-8 w-32 bg-gray-200 rounded" />
                        </div>
                    ))}
                </div>

                {/* Returns Analysis (3 cols) */}
                <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center">
                        <div className="h-6 w-48 bg-gray-200 rounded" />
                        <div className="h-8 w-64 bg-gray-200 rounded-lg" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-[110px]">
                                <div className="h-4 w-24 bg-gray-50 rounded mb-3" />
                                <div className="h-8 w-32 bg-gray-200 rounded" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Detailed Breakdown (2 cols) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 h-[340px] space-y-5">
                            <div className="h-6 w-40 bg-gray-100 rounded mb-6" />
                            <div className="space-y-4">
                                {[...Array(4)].map((_, j) => (
                                    <div key={j} className="flex justify-between">
                                        <div className="h-4 w-24 bg-gray-50 rounded" />
                                        <div className="h-4 w-16 bg-gray-100 rounded" />
                                    </div>
                                ))}
                                <div className="h-px bg-gray-100 my-4" />
                                <div className="flex justify-between">
                                    <div className="h-6 w-32 bg-gray-100 rounded" />
                                    <div className="h-6 w-24 bg-gray-200 rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
           </div>
        </div>
      </div>
    );
  }

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

          <Tabs
            defaultValue="portfolio"
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as "portfolio" | "performance")}
            className="space-y-6"
            ref={tabsRef}
          >
            <TabsList className="bg-slate-100/50 p-1 h-auto inline-flex">
              <TabsTrigger
                value="portfolio"
                className="px-6 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900 transition-all rounded-md"
              >
                Portfolio
              </TabsTrigger>
              <TabsTrigger
                value="performance"
                className="px-6 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900 transition-all rounded-md"
              >
                Performance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="portfolio" className="space-y-6 animate-in fade-in-0 mt-0">
              <Summary
                portfolio={portfolio}
                performance={performance}
                holdings={holdings}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
              />
              <PortfolioTabs
                onRemove={sell}
                byHolding={totals.byHolding}
                transactions={transactions}
                isLoading={isLoading}
                selectedPeriod={selectedPeriod}
                externalTab={activeSubTab}
              />
            </TabsContent>

            <TabsContent value="performance" className="space-y-6 animate-in fade-in-0 mt-0">
              <Performance />
            </TabsContent>
          </Tabs>
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
