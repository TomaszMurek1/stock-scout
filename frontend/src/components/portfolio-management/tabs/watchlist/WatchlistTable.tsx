"use client"

import {
    Table,
    TableHeader,
    TableHead,
    TableBody,
    TableRow,
} from "@/components/ui/table"
import { WatchlistRow } from "./WatchlistRow"
import { AppState, useAppStore } from "@/store/appStore"

export function WatchlistTable() {
    const watchlist = useAppStore((state: AppState) => state.watchlist.data)
    const isLoading = useAppStore((state: AppState) => state.watchlist.isLoading)

    if (isLoading && watchlist.length === 0) {
        return (
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-4">
                <p className="text-gray-600">Loading watchlist...</p>
            </div>
        )
    }

    if (watchlist.length === 0) {
        return (
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-4">
                <p className="text-gray-600">No stocks in your watchlist. Please add some.</p>
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Favorite</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>% From ATH</TableHead>
                    <TableHead>Golden Cross</TableHead>
                    <TableHead>Alerts</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {watchlist.map((stock) => (
                    <WatchlistRow key={stock.ticker} stock={stock} />
                ))}
            </TableBody>
        </Table>
    )
}
