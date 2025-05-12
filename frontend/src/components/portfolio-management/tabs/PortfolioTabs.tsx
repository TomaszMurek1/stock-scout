"use client"

import React, { lazy, Suspense } from "react"
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs"
import { BarChart3, Bell, Clock, DollarSign, PieChart } from "lucide-react"
import type { PortfolioStock } from "../types"

const HoldingsTab = lazy(() => import("../tabs/holdings/HoldingsTab"))
// const WatchlistTab = lazy(() => import("../tabs/WatchlistTab"))
const AlertsTab = lazy(() => import("../tabs/alerts/AlertsTab"))
const TransactionsTab = lazy(() => import("../tabs/transactions/TransactionsTab"))
const CashTab = lazy(() => import("../tabs/cash/CashTab"))
const RiskTab = lazy(() => import("../tabs/risk/RiskTab"))

interface PortfolioTabsProps {
    stocks: PortfolioStock[]
    onRemove: (ticker: string) => void
    onRefresh: () => void
}

export default function PortfolioTabs({
    stocks,
    onRemove,
    onRefresh,
}: PortfolioTabsProps) {
    return (
        <Tabs defaultValue="holdings" className="w-full">
            <TabsList className="grid grid-cols-5 mb-4">
                <TabsTrigger value="holdings" className="flex items-center">
                    <BarChart3 className="mr-2 h-4 w-4 text-primary" />
                    Your Stocks
                </TabsTrigger>
                {/* <TabsTrigger value="watchlist" className="flex items-center">
          <BarChart3 className="mr-2 h-4 w-4 text-primary" />
          Watchlist
        </TabsTrigger> */}
                <TabsTrigger value="alerts" className="flex items-center">
                    <Bell className="mr-2 h-4 w-4 text-primary" />
                    Alerts
                </TabsTrigger>
                <TabsTrigger value="transactions" className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-primary" />
                    Transactions
                </TabsTrigger>
                <TabsTrigger value="cash" className="flex items-center">
                    <DollarSign className="mr-2 h-4 w-4 text-primary" />
                    Cash
                </TabsTrigger>
                <TabsTrigger value="risk" className="flex items-center">
                    <PieChart className="mr-2 h-4 w-4 text-primary" />
                    Risk
                </TabsTrigger>
            </TabsList>

            <Suspense fallback={<div>Loading tab…</div>}>
                <TabsContent value="holdings">
                    <HoldingsTab
                        stocks={stocks}
                        onRemove={onRemove}
                    />
                </TabsContent>
                {/* <TabsContent value="watchlist">
          <WatchlistTab />
        </TabsContent> */}
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
    )
}
