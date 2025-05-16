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
import type { Stock } from "./types"
import { fetchPortfolioData } from "@/services/api/portfolio"

export default function PortfolioManagement() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [stocks, setStocks] = useState<Stock[]>([
        { id: "1", symbol: "AAPL", name: "Apple Inc.", shares: 10, purchasePrice: 150.75, currentPrice: 175.25 },
        { id: "2", symbol: "MSFT", name: "Microsoft Corporation", shares: 5, purchasePrice: 245.3, currentPrice: 280.15 },
        { id: "3", symbol: "GOOGL", name: "Alphabet Inc.", shares: 2, purchasePrice: 2750.0, currentPrice: 2850.5 },
        { id: "3", symbol: "GOOGL2", name: "Alphabet2 Inc.", shares: 2, purchasePrice: 222.0, currentPrice: 2222.5 },
    ])
    const [watchlist, setWatchlist] = useState<any[]>([])

    useEffect(() => {
        fetchPortfolioData().then((list) => {
            setWatchlist(list)
            console.log("Fetched portfolio data:", list);
        });
    }, []);

    const addStock = (stock: Omit<Stock, "id">) => {
        const newStock = {
            ...stock,
            id: Date.now().toString(),
        }
        setStocks([...stocks, newStock])
        setIsAddModalOpen(false)
    }

    const removeStock = (id: string) => {
        setStocks(stocks.filter((stock) => stock.id !== id))
    }

    const totalValue = stocks.reduce((sum, stock) => sum + stock.currentPrice * stock.shares, 0)
    const totalInvested = stocks.reduce((sum, stock) => sum + stock.purchasePrice * stock.shares, 0)
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

            {/* Portfolio Performance Chart */}
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

                        <StockList stocks={stocks} onRemove={removeStock} />
                    </div>
                </TabsContent>

                <TabsContent value="watchlist" className="mt-0">
                    <WatchlistSection watchlist={watchlist} />
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

            <AddStockModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={addStock} />
        </div>
    )
}
