"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Star, Plus, Bell, RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface WatchlistStock {
    id: string
    symbol: string
    name: string
    price: number
    percentFromATH: number
    goldenCross: boolean
    isFavorite: boolean
}

export default function WatchlistSection() {
    const [watchlist, setWatchlist] = useState<WatchlistStock[]>([
        {
            id: "1",
            symbol: "NVDA",
            name: "NVIDIA Corporation",
            price: 845.2,
            percentFromATH: -5.2,
            goldenCross: true,
            isFavorite: true,
        },
        {
            id: "2",
            symbol: "AMZN",
            name: "Amazon.com Inc.",
            price: 178.75,
            percentFromATH: -12.8,
            goldenCross: false,
            isFavorite: false,
        },
        {
            id: "3",
            symbol: "TSLA",
            name: "Tesla, Inc.",
            price: 215.35,
            percentFromATH: -45.6,
            goldenCross: false,
            isFavorite: true,
        },
        {
            id: "4",
            symbol: "META",
            name: "Meta Platforms, Inc.",
            price: 485.9,
            percentFromATH: -2.1,
            goldenCross: true,
            isFavorite: false,
        },
    ])

    const [selectedStock, setSelectedStock] = useState<WatchlistStock | null>(null)
    const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false)

    const toggleFavorite = (id: string) => {
        setWatchlist(watchlist.map((stock) => (stock.id === id ? { ...stock, isFavorite: !stock.isFavorite } : stock)))
    }

    return (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Watchlist</h2>
                <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="text-gray-600">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Stock
                    </Button>
                    <Button variant="outline" size="sm" className="text-gray-600">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Favorite
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Company
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                % From ATH
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Golden Cross
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alerts</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {watchlist.map((stock) => (
                            <tr key={stock.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleFavorite(stock.id)}
                                        className={stock.isFavorite ? "text-amber-600" : "text-gray-400"}
                                    >
                                        <Star className="h-5 w-5 fill-current" />
                                    </Button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-medium">{stock.symbol}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{stock.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">${stock.price.toFixed(2)}</td>
                                <td
                                    className={`px-6 py-4 whitespace-nowrap ${stock.percentFromATH < -20 ? "text-red-600" : "text-amber-600"}`}
                                >
                                    {stock.percentFromATH.toFixed(1)}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                        className={`px-2 py-1 text-xs rounded-full ${stock.goldenCross ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                                            }`}
                                    >
                                        {stock.goldenCross ? "Yes" : "No"}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-gray-600"
                                                onClick={() => setSelectedStock(stock)}
                                            >
                                                <Bell className="h-4 w-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Set Alerts for {selectedStock?.symbol}</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <h3 className="text-sm font-medium">Price Alerts</h3>
                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                            type="checkbox"
                                                            id="price-drop"
                                                            className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                                                        />
                                                        <label htmlFor="price-drop" className="text-sm">
                                                            Alert me if price drops by
                                                        </label>
                                                        <select className="rounded border-gray-300 text-sm">
                                                            <option>10%</option>
                                                            <option>20%</option>
                                                            <option>30%</option>
                                                            <option>40%</option>
                                                            <option>50%</option>
                                                        </select>
                                                        <span className="text-sm">from peak</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <h3 className="text-sm font-medium">Technical Indicators</h3>
                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                            type="checkbox"
                                                            id="golden-cross"
                                                            className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                                                        />
                                                        <label htmlFor="golden-cross" className="text-sm">
                                                            Alert me on Golden Cross (50 SMA crosses above 200 SMA)
                                                        </label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                            type="checkbox"
                                                            id="death-cross"
                                                            className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                                                        />
                                                        <label htmlFor="death-cross" className="text-sm">
                                                            Alert me on Death Cross (50 SMA crosses below 200 SMA)
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <h3 className="text-sm font-medium">Volume Alerts</h3>
                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                            type="checkbox"
                                                            id="unusual-volume"
                                                            className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                                                        />
                                                        <label htmlFor="unusual-volume" className="text-sm">
                                                            Alert me on unusual volume (2x average)
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex justify-end">
                                                <Button className="bg-gray-800 text-white hover:bg-gray-700">Save Alerts</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
