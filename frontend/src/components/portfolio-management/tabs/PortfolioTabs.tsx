"use client";

import React, { lazy, Suspense } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3, Bell, Clock, DollarSign, PieChart } from "lucide-react";
import { ApiHolding, Transaction } from "../types";

const HoldingsTab = lazy(() => import("../tabs/holdings/HoldingsTab"));
const WatchlistTab = lazy(() => import("../tabs/watchlist/WatchlistTab"));
const AlertsTab = lazy(() => import("../tabs/alerts/AlertsTab"));
const TransactionsTab = lazy(() => import("../tabs/transactions/TransactionsTab"));
const CashTab = lazy(() => import("../tabs/cash/CashTab"));
const RiskTab = lazy(() => import("../tabs/risk/RiskTab"));

interface PortfolioTabsProps {
  byHolding?: ApiHolding[];
  transactions: Transaction[];
  onRemove: (ticker: string) => void;
}

export default function PortfolioTabs({
  byHolding,
  transactions,
  onRemove,
}: PortfolioTabsProps) {
  const bgColor =
    "data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900";
  return (
    <Tabs defaultValue="holdings" className="w-full">
      <TabsList className="bg-slate-100/50 p-1 h-auto grid grid-cols-6 gap-2 mb-6">
        <TabsTrigger value="holdings" className={`flex items-center justify-center gap-2 py-2.5 rounded-md transition-all ${bgColor}`}>
          <BarChart3 className="h-4 w-4" />
          <span className="font-medium">Your Stocks</span>
        </TabsTrigger>
        <TabsTrigger value="watchlist" className={`flex items-center justify-center gap-2 py-2.5 rounded-md transition-all ${bgColor}`}>
          <BarChart3 className="h-4 w-4" />
          <span className="font-medium">Watchlist</span>
        </TabsTrigger>
        <TabsTrigger value="alerts" className={`flex items-center justify-center gap-2 py-2.5 rounded-md transition-all ${bgColor}`}>
          <Bell className="h-4 w-4" />
          <span className="font-medium">Alerts</span>
        </TabsTrigger>
        <TabsTrigger value="transactions" className={`flex items-center justify-center gap-2 py-2.5 rounded-md transition-all ${bgColor}`}>
          <Clock className="h-4 w-4" />
          <span className="font-medium">Transactions</span>
        </TabsTrigger>
        <TabsTrigger value="cash" className={`flex items-center justify-center gap-2 py-2.5 rounded-md transition-all ${bgColor}`}>
          <DollarSign className="h-4 w-4" />
          <span className="font-medium">Cash</span>
        </TabsTrigger>
        <TabsTrigger value="risk" className={`flex items-center justify-center gap-2 py-2.5 rounded-md transition-all ${bgColor}`}>
          <PieChart className="h-4 w-4" />
          <span className="font-medium">Risk</span>
        </TabsTrigger>
      </TabsList>

      <Suspense fallback={<div>Loading tab…</div>}>
        <TabsContent value="holdings">
          <HoldingsTab holdings={byHolding ?? []} transactions={transactions} onRemove={onRemove} />
        </TabsContent>
        <TabsContent value="watchlist">
          <WatchlistTab />
        </TabsContent>
        <TabsContent value="alerts">
          <AlertsTab />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsTab />
        </TabsContent>
        <TabsContent value="cash">
          <CashTab />
        </TabsContent>
        <TabsContent value="risk">
          <RiskTab />
        </TabsContent>
      </Suspense>
    </Tabs>
  );
}
