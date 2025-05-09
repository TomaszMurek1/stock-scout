import {
    Table,
    TableHeader,
    TableHead,
    TableBody,
    TableRow,
} from "@/components/ui/table"
import { WatchlistRow } from "./WatchlistRow"
import { useEffect } from "react"
import { FavoritesStock, useFavoritesStore } from "@/store/favoritesStore"
import { fetchPortfolioData } from "@/services/api/portfolio"


export function WatchlistTable() {
    const favorites = useFavoritesStore(s => s.favorites)
    const setFavorites = useFavoritesStore(s => s.setFavorites)
    useEffect(() => {
        if (favorites.length === 0) {
            fetchPortfolioData().then((list: FavoritesStock[]) => {
                setFavorites(list)
            })
        }
    }, [favorites, setFavorites])

    if (favorites.length === 0) {
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
                {favorites.map((stock) => (
                    <WatchlistRow key={stock.company_id} stock={stock} />
                ))}
            </TableBody>
        </Table>
    )
}