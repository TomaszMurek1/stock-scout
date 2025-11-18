"use client"

import { useMemo } from "react"
import { MRT_ColumnDef } from "material-react-table"
import type { WatchlistStock } from "./types"

const formatCurrency = (value: number | null | undefined, currency?: string | null) => {
    if (value === null || value === undefined) {
        return "—"
    }
    const formatter = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "USD",
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    })
    return formatter.format(value)
}

export function useWatchlistColumns(): MRT_ColumnDef<WatchlistStock>[] { 
    return useMemo<MRT_ColumnDef<WatchlistStock>[]>(() => [
        {
            accessorKey: "ticker",
            header: "Ticker",
            size: 80,
            Cell: ({ cell }) => (
                <span className="font-semibold text-gray-900">{cell.getValue<string>()}</span>
            ),
        },
        {
            accessorKey: "name",
            header: "Company",
            enableSorting: true,
        },
        {
            header: "Last Price",
            accessorFn: (row) => row.market_data?.last_price ?? null,
            id: "last_price",
            Cell: ({ cell, row }) => formatCurrency(cell.getValue<number | null>(), row.original.market_data?.currency),
        },
        {
            header: "Currency",
            accessorFn: (row) => row.market_data?.currency ?? "—",
            id: "currency",
        },
        {
            header: "Held",
            accessorFn: (row) => (row.is_held ? "Yes" : "No"),
            id: "is_held",
        },
        {
            header: "Shares Held",
            accessorFn: (row) => row.held_shares ?? null,
            id: "held_shares",
            Cell: ({ cell }) => {
                const value = cell.getValue<number | null>()
                return value !== null && value !== undefined ? value.toFixed(2) : "—"
            },
        },
        {
            header: "Added",
            accessorFn: (row) => row.added_at ?? null,
            id: "added_at",
            Cell: ({ cell }) => {
                const value = cell.getValue<string | null>()
                if (!value) return "—"
                const dt = new Date(value)
                return dt.toLocaleDateString()
            },
        },
    ], [])
}
