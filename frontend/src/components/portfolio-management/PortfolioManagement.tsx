"use client";

import { useEffect, useState } from "react";
import Header from "./parts/Header";
import Summary from "./parts/summary/Summary";
import Performance from "./parts/performance/Performance";
import AddStockModal from "./modals/AddStockModal";
import { usePortfolioBaseData } from "./hooks/usePortfolioBaseData";
import { TimeRange } from "./parts/performance/performance-chart";
import { usePortfolioTotals } from "./hooks/usePortfolioTotals";
import PortfolioTabs from "./tabs/PortfolioTabs";

const rangeDays: Record<Exclude<TimeRange, "All">, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
};

export default function PortfolioManagement() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"portfolio" | "performance">("portfolio");
  const { portfolio, holdings, transactions, performance, refreshPortfolio, sell } =
    usePortfolioBaseData();

  const portfolioCurrency = portfolio?.currency || "USD";
  const totals = usePortfolioTotals({
    performance,
    transactions,
    holdings,
    portfolio,
  });

  useEffect(() => {
    refreshPortfolio();
  }, [refreshPortfolio]);

  if (!portfolio || !totals) return <div>No portfolio found</div>;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <Header onAdd={() => setIsAddModalOpen(true)} />
      <div className="space-y-4">
        {/* Tab Switcher */}
        <div className="flex space-x-4 border-b pb-2">
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`px-4 py-2 font-medium ${activeTab === "portfolio" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"}`}
          >
            Portfolio
          </button>
          <button
            onClick={() => setActiveTab("performance")}
            className={`px-4 py-2 font-medium ${activeTab === "performance" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"}`}
          >
            Performance
          </button>
        </div>

        {/* Conditional Rendering */}
        {activeTab === "portfolio" && (
          <>
            <Summary
              totalValue={totals.totalValue}
              totalInvested={totals.totalInvested}
              totalGainLoss={totals.totalGainLoss}
              percentageChange={totals.percentageChange}
              currency={portfolio.currency}
            />
            <PortfolioTabs
              onRemove={sell}
              onRefresh={refreshPortfolio}
              byHolding={totals.byHolding}
            />
          </>
        )}

        {activeTab === "performance" && <Performance />}
      </div>

      <AddStockModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}
