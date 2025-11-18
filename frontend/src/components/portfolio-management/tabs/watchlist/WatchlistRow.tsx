"use client"

import { TableRow, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import { AlertsDialog } from "./AlertsDialog"
import { useNavigate } from "react-router-dom"

import type { MouseEvent } from 'react'
import { apiClient } from "@/services/apiClient"
import { AppState, useAppStore } from "@/store/appStore"
import { WatchlistStock } from "./types"

interface WatchlistRowProps {
    stock: WatchlistStock
}


export function WatchlistRow({ stock }: WatchlistRowProps) {
    const navigate = useNavigate()

    const toggleWatchlist = useAppStore(
        (state: AppState) => state.toggleWatchlist
    )
    const refreshWatchlist = useAppStore(
        (state: AppState) => state.refreshWatchlist
    )

    const handleWatchlistClick = async (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation()
        toggleWatchlist(stock)
        try {
            await apiClient.delete(`/watchlist/${stock.ticker}`)
            await refreshWatchlist()
        } catch {
            toggleWatchlist(stock)
        }
    }
    return (
        <TableRow
            onClick={() => navigate(`/stock-details/${stock.ticker}`)}
            className="cursor-pointer hover:bg-slate-100 transition"
        >
            <TableCell>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleWatchlistClick}
                    className="text-amber-600"
                >
                    <Star className="h-5 w-5 fill-current" />
                </Button>
            </TableCell>

            <TableCell className="text-left font-medium">{stock.ticker}</TableCell>
            <TableCell className="text-left">{stock.name}</TableCell>
            <TableCell>$</TableCell>
            <TableCell className={'text-amber-600'}>
                %
            </TableCell>
            <TableCell>
                <span
                    className={`px-2 py-1 text-xs rounded-full 'bg-gray-100 text-gray-800'
                        }`}
                >
                    {'No'}
                </span>
            </TableCell>
            {/* //TODO: extend Favorites Stock to include additional data */}
            {/* <TableCell className={stock.percentFromATH < -20 ? 'text-red-600' : 'text-amber-600'}>
                {stock.percentFromATH?.toFixed(1)}%
            </TableCell>
            <TableCell>
                <span
                    className={`px-2 py-1 text-xs rounded-full ${stock.goldenCross ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                >
                    {stock.goldenCross ? 'Yes' : 'No'}
                </span>
            </TableCell> */}
            <TableCell>
                <AlertsDialog stockName={stock.name} />
            </TableCell>
        </TableRow>
    )
}
