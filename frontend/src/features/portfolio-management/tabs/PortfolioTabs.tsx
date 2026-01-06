"use client";

import React, { lazy, Suspense, useState } from "react";
import { AnimatedTabs, AnimatedTabsContent, AnimatedTabsList, FramerTabTrigger } from "@/components/ui/animated-tabs";
import { BarChart3, Bell, Clock, DollarSign, PieChart } from "lucide-react";
import { ApiHolding, Transaction, Period } from "../types";
import { useTranslation } from "react-i18next";

const HoldingsTab = lazy(() => import("./holdings/HoldingsTab"));
const WatchlistTab = lazy(() => import("./watchlist/WatchlistTab"));
const AlertsTab = lazy(() => import("./alerts/AlertsTab"));
const TransactionsTab = lazy(() => import("./transactions/TransactionsTab"));
const CashTab = lazy(() => import("./cash/CashTab"));
const RiskTab = lazy(() => import("./risk/RiskTab"));

interface PortfolioTabsProps {
  byHolding?: ApiHolding[];
  transactions: Transaction[];
  onRemove: (ticker: string) => void;
  isLoading?: boolean;
  selectedPeriod?: Period;
  externalTab?: string | null;
  accounts?: any[];
  portfolioCurrency?: string;
}

export default function PortfolioTabs({
  byHolding,
  transactions,
  onRemove,
  isLoading,
  selectedPeriod,
  externalTab,
  accounts,
  portfolioCurrency,
}: PortfolioTabsProps) {
  const [activeTab, setActiveTab] = useState("holdings");
  const { t } = useTranslation();

  React.useEffect(() => {
    if (externalTab) {
      setActiveTab(externalTab);
    }
  }, [externalTab]);

  const bgColor =
    "data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900";
  return (
    <AnimatedTabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <AnimatedTabsList className="bg-slate-100/50 p-1 w-full justify-start overflow-x-auto no-scrollbar gap-1 mb-6">
        <FramerTabTrigger 
            value="holdings" 
            isSelected={activeTab === "holdings"}
            layoutId="portfolio-subtabs"
            className="flex-1 min-w-[120px]"
        >
          <BarChart3 className="h-4 w-4" />
          <span className="font-medium">{t("portfolio.tabs.your_stocks")}</span>
        </FramerTabTrigger>
        
        <FramerTabTrigger 
            value="watchlist" 
            isSelected={activeTab === "watchlist"}
            layoutId="portfolio-subtabs"
            className="flex-1 min-w-[120px]"
        >
          <BarChart3 className="h-4 w-4" />
          <span className="font-medium">{t("portfolio.tabs.watchlist")}</span>
        </FramerTabTrigger>

        <FramerTabTrigger 
            value="alerts" 
            isSelected={activeTab === "alerts"}
            layoutId="portfolio-subtabs"
            className="flex-1 min-w-[120px]"
        >
          <Bell className="h-4 w-4" />
          <span className="font-medium">{t("portfolio.tabs.alerts")}</span>
        </FramerTabTrigger>

        <FramerTabTrigger 
            value="transactions" 
            isSelected={activeTab === "transactions"}
            layoutId="portfolio-subtabs"
            className="flex-1 min-w-[120px]"
        >
          <Clock className="h-4 w-4" />
          <span className="font-medium">{t("portfolio.tabs.transactions")}</span>
        </FramerTabTrigger>

        <FramerTabTrigger 
            value="cash" 
            isSelected={activeTab === "cash"}
            layoutId="portfolio-subtabs"
            className="flex-1 min-w-[120px]"
        >
          <DollarSign className="h-4 w-4" />
          <span className="font-medium">{t("portfolio.tabs.cash")}</span>
        </FramerTabTrigger>

        <FramerTabTrigger 
            value="risk" 
            isSelected={activeTab === "risk"}
            layoutId="portfolio-subtabs"
            className="flex-1 min-w-[120px]"
        >
          <PieChart className="h-4 w-4" />
          <span className="font-medium">{t("portfolio.tabs.risk")}</span>
        </FramerTabTrigger>
      </AnimatedTabsList>

      <Suspense fallback={<div>{t("common.loading")}</div>}>
        <AnimatedTabsContent value="holdings" forceMount={true} className="min-h-[500px]">
          <HoldingsTab 
             holdings={byHolding ?? []} 
             transactions={transactions} 
             onRemove={onRemove} 
             isLoading={isLoading} 
             selectedPeriod={selectedPeriod}
          />
        </AnimatedTabsContent>
        <AnimatedTabsContent value="watchlist" forceMount={true} className="min-h-[500px]">
          <WatchlistTab />
        </AnimatedTabsContent>
        <AnimatedTabsContent value="alerts" forceMount={true} className="min-h-[500px]">
          <AlertsTab />
        </AnimatedTabsContent>
        <AnimatedTabsContent value="transactions" forceMount={true} className="min-h-[500px]">
          <TransactionsTab transactions={transactions} portfolioCurrency={portfolioCurrency} />
        </AnimatedTabsContent>
        <AnimatedTabsContent value="cash" forceMount={true} className="min-h-[500px]">
          <CashTab accounts={accounts} transactions={transactions} />
        </AnimatedTabsContent>
        <AnimatedTabsContent value="risk" forceMount={true} className="min-h-[500px]">
          <RiskTab />
        </AnimatedTabsContent>
      </Suspense>
    </AnimatedTabs>
  );
}
