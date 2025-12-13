"use client";

import { useEffect, useState } from "react";
import { Header } from "./parts/Header";
import Summary from "./parts/summary/Summary";
import Performance from "./parts/performance/Performance";
import AddStockModal from "./modals/AddStockModal";
import { usePortfolioBaseData } from "./hooks/usePortfolioBaseData";
import { usePortfolioTotals } from "./hooks/usePortfolioTotals";
import PortfolioTabs from "./tabs/PortfolioTabs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PortfolioManagement() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"portfolio" | "performance">("portfolio");

  const { portfolio, holdings, transactions, performance, refreshPortfolio, sell } =
    usePortfolioBaseData();

  const totals = usePortfolioTotals({
    performance,
    holdings,
    portfolio,
  });

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
      <div className="max-w-[1600px] mx-auto px-4 py-8 space-y-8">
        {/* Header Card */}
        <div className="p-6 rounded-xl bg-white shadow-sm border border-gray-200">
          <Header onAdd={() => setIsAddModalOpen(true)} />
        </div>

        <Tabs
          defaultValue="portfolio"
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "portfolio" | "performance")}
          className="space-y-6"
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
            />
            <PortfolioTabs
              onRemove={sell}
              byHolding={totals.byHolding}
              transactions={transactions}
            />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6 animate-in fade-in-0 mt-0">
            <Performance />
          </TabsContent>
        </Tabs>

        <AddStockModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddSuccess}
        />
      </div>
    </div>
  );
}
