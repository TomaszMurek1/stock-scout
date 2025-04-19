import {
    Table,
    TableHeader,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
} from "@/components/ui/table"
import { WatchlistStock } from "./types"
import { WatchlistRow } from "./WatchlistRow"

interface WatchlistTableProps {
    data: WatchlistStock[]
    onToggleFavorite: (id: number) => void
}

export function WatchlistTable({ data, onToggleFavorite }: WatchlistTableProps) {
    debugger
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
                {data.map((stock) => (
                    <WatchlistRow key={stock.company_id} stock={stock} onToggleFavorite={onToggleFavorite} />
                ))}
            </TableBody>
        </Table>
    )
}