import {
    Table,
    TableHeader,
    TableHead,
    TableBody,
    TableRow,
} from "@/components/ui/table"
import { WatchlistRow } from "./WatchlistRow"
import { useEffect } from "react"
import { WatchlistStock, useWatchlistStore } from "@/store/watchlistStore"
import { fetchPortfolioData } from "@/services/api/portfolio"


export function WatchlistTable() {
    const watchlist = useWatchlistStore(s => s.watchlist)
    const setWatchlist = useWatchlistStore(s => s.setWatchlist)
    useEffect(() => {
        if (watchlist.length === 0) {
            fetchPortfolioData().then((list: WatchlistStock[]) => {
                setWatchlist(list)
            })
        }
    }, [watchlist, setWatchlist])

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