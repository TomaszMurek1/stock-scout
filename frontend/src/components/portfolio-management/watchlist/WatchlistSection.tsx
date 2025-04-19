"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw } from "lucide-react"
import { WatchlistTable } from "./WatchlistTable"
import { WatchlistStock } from "./types"

interface WatchlistSectionProps {
    watchlist: WatchlistStock[]
}

export default function WatchlistSection({ watchlist }: WatchlistSectionProps) {
    const [data, setData] = useState<WatchlistStock[]>([])

    // Sync local state whenever the incoming prop changes
    useEffect(() => {
        setData(watchlist)
    }, [watchlist])

    const toggleFavorite = (id: number) => {
        setData((prev) =>
            prev.map((stock) =>
                stock.company_id === id ? { ...stock, isFavorite: !stock.isFavorite } : stock
            )
        )
    }

    console.log('watchlist', watchlist)
    console.log('data', data)

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
                <WatchlistTable data={data} onToggleFavorite={toggleFavorite} />
            </div>
        </div>
    )
}