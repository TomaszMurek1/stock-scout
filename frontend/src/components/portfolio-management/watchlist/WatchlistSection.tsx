"use client"
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw } from 'lucide-react'
import { fetchPortfolioData } from '@/services/api/portfolio'
import type { WatchlistStock } from './types'
import { useFavoritesStore } from '@/store/favoritesStore'
import { WatchlistTable } from './WatchlistTable'

export default function WatchlistSection() {
    const setFavorites = useFavoritesStore(s => s.setFavorites)
    const handleRefresh = () =>
        fetchPortfolioData().then((list: WatchlistStock[]) => {
            setFavorites(list)
        })


    return (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Watchlist</h2>
                <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="text-gray-600">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Stock
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-gray-600"
                        onClick={handleRefresh}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <WatchlistTable />
            </div>
        </div>
    )
}