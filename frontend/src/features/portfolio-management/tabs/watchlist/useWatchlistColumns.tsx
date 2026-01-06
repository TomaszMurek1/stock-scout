"use client"

import { useMemo } from "react"
import { MRT_ColumnDef } from "material-react-table"
import type { WatchlistStock } from "./types"
import { API_URL } from "@/services/apiClient"
import { useTranslation } from "react-i18next"

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
    const { t } = useTranslation()
    return useMemo<MRT_ColumnDef<WatchlistStock>[]>(() => [
        {
            accessorKey: "name",
            header: t("portfolio.holdings.company"), 
            enableSorting: true,
            Cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <img
                        src={`${API_URL}/stock-details/${row.original.ticker}/logo`}
                        alt={row.original.ticker}
                        className="w-8 h-8 object-contain bg-gray-200 rounded p-1"
                        onError={(e) => {
                            e.currentTarget.style.display = "none";
                        }}
                    />
                    <div className="flex flex-col">
                        <span className="font-medium">{row.original.name}</span>
                        <span className="text-xs text-gray-500">{row.original.ticker}</span>
                    </div>
                </div>
            ),
        },
        {
            header: t("portfolio.watchlist.last_price"),
            accessorFn: (row) => row.market_data?.last_price ?? null,
            id: "last_price",
            Cell: ({ cell, row }) => formatCurrency(cell.getValue<number | null>(), row.original.market_data?.currency),
        },
        {
            header: t("common.currency"),
            accessorFn: (row) => row.market_data?.currency ?? "—",
            id: "currency",
        },
        {
            header: t("portfolio.watchlist.held"),
            accessorFn: (row) => (row.is_held ? t("common.yes") : t("common.no")),
            id: "is_held",
        },
        {
            header: t("portfolio.watchlist.shares_held"),
            accessorFn: (row) => row.held_shares ?? null,
            id: "held_shares",
            Cell: ({ cell }) => {
                const value = cell.getValue<number | null>()
                return value !== null && value !== undefined ? value.toFixed(2) : "—"
            },
        },
        {
            header: t("portfolio.watchlist.added"),
            accessorFn: (row) => row.added_at ?? null,
            id: "added_at",
            Cell: ({ cell }) => {
                const value = cell.getValue<string | null>()
                if (!value) return "—"
                const dt = new Date(value)
                return dt.toLocaleDateString()
            },
        },
    ], [t])
}
