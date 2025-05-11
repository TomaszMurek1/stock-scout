"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, RefreshCw, BarChart3, Bell, Clock, DollarSign, PieChart, TrendingUp } from "lucide-react"
import PortfolioSummary from "./portfolio-summary"
import StockList from "./stock-list"
import AddStockModal from "./add-stock-modal"
import WatchlistSection from "./watchlist/WatchlistSection"
import AlertsPanel from "./alert-panel"
import TransactionsHistory from "./transactions-history"
import CashBalanceTracker from "./cash-balance-tracker"
import RiskAnalysis from "./risk-analysis"
import PerformanceChart from "./performance-chart"
import type { PortfolioStock } from "./types"
import { usePortfolioStore } from "@/store/portfolioStore"



export default function PortfolioManagement() {
    // local UI state still lives here
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)

    // ===== zustand slices & actions =====
    const {
        holdings,
        refresh: refreshHoldings,
        buy,
        sell
    } = usePortfolioStore();

    useEffect(() => {
        refreshHoldings();
    }, [refreshHoldings]);

    const uiStocks: PortfolioStock[] = holdings.map((h) => ({

        symbol: h.ticker,
        name: h.ticker,              // (or pull real name if you need it)
        purchasePrice: Number(h.average_cost),
        currentPrice: h.market_price ? Number(h.market_price) : null,
    }));

    const removeHolding = async (symbol: string) => {
        const target = holdings.find((h) => h.ticker === symbol);
        if (!target) return;

        /* sell ALL shares to zero out the position, fee = 0 */
        await sell({
            ticker: target.ticker,
            shares: Number(target.shares),
            price: Number(target.market_price ?? target.average_cost),
            fee: 0,
        });
    };
    // derived totals
    const totalValue = holdings.reduce((sum: number, s: any) => sum + s.currentPrice * s.shares, 0)
    const totalInvested = holdings.reduce((sum: number, s: any) => sum + s.average_price * s.shares, 0)
    debugger
    const totalGainLoss = totalValue - totalInvested
    const percentageChange = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Portfolio Management</h1>
                <Button onClick={() => setIsAddModalOpen(true)} className="bg-primary text-white hover:bg-primary/90">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Stock
                </Button>
            </div>

            <PortfolioSummary
                totalValue={totalValue}
                totalInvested={totalInvested}
                totalGainLoss={totalGainLoss}
                percentageChange={percentageChange}
            />

            <PerformanceChart />

            <Tabs defaultValue="watchlist" className="w-full">
                <TabsList className="grid grid-cols-6 mb-4">
                    <TabsTrigger value="holdings" className="flex items-center">
                        <BarChart3 className="mr-2 h-4 w-4 text-primary" />
                        <span>Holdings</span>
                    </TabsTrigger>
                    <TabsTrigger value="watchlist" className="flex items-center">
                        <TrendingUp className="mr-2 h-4 w-4 text-primary" />
                        <span>Watchlist</span>
                    </TabsTrigger>
                    <TabsTrigger value="alerts" className="flex items-center">
                        <Bell className="mr-2 h-4 w-4 text-primary" />
                        <span>Alerts</span>
                    </TabsTrigger>
                    <TabsTrigger value="transactions" className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-primary" />
                        <span>Transactions</span>
                    </TabsTrigger>
                    <TabsTrigger value="cash" className="flex items-center">
                        <DollarSign className="mr-2 h-4 w-4 text-primary" />
                        <span>Cash</span>
                    </TabsTrigger>
                    <TabsTrigger value="risk" className="flex items-center">
                        <PieChart className="mr-2 h-4 w-4 text-primary" />
                        <span>Risk</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="holdings" className="mt-0">
                    <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                                <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                                Your Stocks
                            </h2>
                            <Button variant="outline" size="sm" className="text-gray-600">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Refresh Prices
                            </Button>
                        </div>

                        <StockList stocks={uiStocks} onRemove={removeHolding} />
                    </div>
                </TabsContent>

                <TabsContent value="watchlist" className="mt-0">
                    <WatchlistSection />
                </TabsContent>
                <TabsContent value="alerts" className="mt-0">
                    <AlertsPanel />
                </TabsContent>

                <TabsContent value="transactions" className="mt-0">
                    <TransactionsHistory />
                </TabsContent>

                <TabsContent value="cash" className="mt-0">
                    <CashBalanceTracker />
                </TabsContent>

                <TabsContent value="risk" className="mt-0">
                    <RiskAnalysis />
                </TabsContent>

            </Tabs>

            <AddStockModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={(stock: Omit<PortfolioStock, "id">) => {
                    addHolding(stock)
                    setIsAddModalOpen(false)
                }}
            />
        </div>
    )
}
