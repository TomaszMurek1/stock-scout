"use client";

import { useEffect, useState } from "react";
import Header from "./parts/Header";
import Summary from "./parts/summary/Summary";
import Performance from "./parts/performance/Performance";
import AddStockModal from "./modals/AddStockModal";
import { usePortfolioBaseData } from "./hooks/usePortfolioBaseData";
import { usePortfolioTotals } from "./hooks/usePortfolioTotals";
import PortfolioTabs from "./tabs/PortfolioTabs";

export default function PortfolioManagement() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"portfolio" | "performance">("portfolio");

  const { portfolio, holdings, transactions, performance, refreshPortfolio, sell } =
    usePortfolioBaseData();

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

  const handleAddSuccess = () => {
    setIsAddModalOpen(false);
    refreshPortfolio();
  };

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <Header onAdd={() => setIsAddModalOpen(true)} />

      <div className="space-y-4">
        {/* Tab Switcher */}
        <div className="flex space-x-4 border-b pb-2">
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`px-4 py-2 font-medium ${
              activeTab === "portfolio"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600"
            }`}
          >
            Portfolio
          </button>
          <button
            onClick={() => setActiveTab("performance")}
            className={`px-4 py-2 font-medium ${
              activeTab === "performance"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600"
            }`}
          >
            Performance
          </button>
        </div>

        {/* Conditional Rendering */}
        {activeTab === "portfolio" && (
          <>
            <Summary
              invested_value_current={totals.invested_value_current}
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

      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
