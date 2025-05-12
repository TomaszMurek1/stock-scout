"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PortfolioStock } from "./types"

interface StockListProps {
    stocks: PortfolioStock[]
    onRemove: (id: string) => void
}

export default function StockList({ stocks, onRemove }: StockListProps) {
    if (stocks.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">No stocks in your portfolio. Add some stocks to get started.</div>
        )
    }
    console.log("stocks", stocks)
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Purchase Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Current Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Gain/Loss
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {stocks.map((stock) => {
                        const value = stock.currentPrice * stock.shares
                        const invested = stock.purchasePrice * stock.shares
                        const gainLoss = value - invested
                        const percentChange = invested > 0 ? (gainLoss / invested) * 100 : 0
                        const isPositive = gainLoss >= 0

                        return (
                            <tr key={stock.id}>
                                <td className="px-6 py-4 whitespace-nowrap font-medium">{stock?.symbol}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{stock.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{stock.shares}</td>
                                <td className="px-6 py-4 whitespace-nowrap">${stock.purchasePrice?.toFixed(2)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">${stock.currentPrice?.toFixed(2)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">${value.toFixed(2)}</td>
                                <td className={`px-6 py-4 whitespace-nowrap ${isPositive ? "text-green-600" : "text-red-600"}`}>
                                    {isPositive ? "+" : ""}
                                    {gainLoss.toFixed(2)} ({isPositive ? "+" : ""}
                                    {percentChange.toFixed(2)}%)
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onRemove(stock.ticker)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
