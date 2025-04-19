import { TableRow, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import { AlertsDialog } from "./AlertsDialog"
import { WatchlistStock } from "./types"
import { useNavigate } from "react-router-dom"

interface WatchlistRowProps {
    stock: WatchlistStock
    onToggleFavorite: (id: number) => void
}


export function WatchlistRow({ stock, onToggleFavorite }: WatchlistRowProps) {
    const navigate = useNavigate()

    return (
        <TableRow
            onClick={() => navigate(`/stock-details/${stock.ticker}`)}
            className="cursor-pointer hover:bg-slate-100 transition"
        >
            <TableCell>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggleFavorite(stock.company_id)
                    }}
                    className={"text-amber-600"}
                >
                    <Star className="h-5 w-5 fill-current" />
                </Button>
            </TableCell>
            <TableCell className="text-left font-medium">{stock.ticker}</TableCell>
            <TableCell className="text-left">{stock.name}</TableCell>
            <TableCell>${stock.price?.toFixed(2)}</TableCell>
            <TableCell className={stock.percentFromATH < -20 ? "text-red-600" : "text-amber-600"}>
                {stock.percentFromATH?.toFixed(1)}%
            </TableCell>
            <TableCell>
                <span
                    className={`px-2 py-1 text-xs rounded-full ${stock.goldenCross ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}
                >
                    {stock.goldenCross ? "Yes" : "No"}
                </span>
            </TableCell>
            <TableCell>
                <AlertsDialog stockName={stock.name} />
            </TableCell>
        </TableRow>)
}