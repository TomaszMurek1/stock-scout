"use client";

import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MaterialReactTable, type MRT_Row } from "material-react-table";
import { IconButton, Tooltip } from "@mui/material";
import { Star } from "lucide-react";
import { AlertsDialog } from "./AlertsDialog";
import { AppState, useAppStore } from "@/store/appStore";
import type { WatchlistStock } from "./types";
import { apiClient } from "@/services/apiClient";
import { useWatchlistColumns } from "./useWatchlistColumns";

export function WatchlistTable() {
  const watchlist = useAppStore((state: AppState) => state.watchlist.data);
  const isLoading = useAppStore((state: AppState) => state.watchlist.isLoading);
  const toggleWatchlist = useAppStore((state: AppState) => state.toggleWatchlist);
  const refreshWatchlist = useAppStore((state: AppState) => state.refreshWatchlist);
  const navigate = useNavigate();

  const columns = useWatchlistColumns();
  const data = useMemo(() => watchlist, [watchlist]);

  const handleRemove = useCallback(
    async (stock: WatchlistStock) => {
      toggleWatchlist(stock);
      try {
        await apiClient.delete(`/watchlist/${stock.ticker}`);
        await refreshWatchlist();
      } catch {
        toggleWatchlist(stock);
      }
    },
    [refreshWatchlist, toggleWatchlist]
  );

  const renderDetailPanel = useCallback(({ row }: { row: MRT_Row<WatchlistStock> }) => {
    const { market_data, note } = row.original;
    return (
      <div className="w-full p-4 grid gap-4 md:grid-cols-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
        <div className="space-y-1">
          <p className="font-semibold text-gray-900">Market data</p>
          <p>
            <span className="font-medium">Last price:</span>{" "}
            {market_data?.last_price !== null && market_data?.last_price !== undefined
              ? `${market_data.last_price} ${market_data?.currency ?? ""}`
              : "—"}
          </p>
          <p>
            <span className="font-medium">Last updated:</span>{" "}
            {market_data?.last_updated ? new Date(market_data.last_updated).toLocaleString() : "—"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-gray-900">Research note</p>
          <p>
            <span className="font-medium">Status:</span> {note?.research_status ?? "—"}
          </p>
          <p>
            <span className="font-medium">Sentiment:</span>{" "}
            {note?.sentiment_score !== null && note?.sentiment_score !== undefined
              ? `${note.sentiment_score} (${note.sentiment_trend ?? "stable"})`
              : "—"}
          </p>
          <p>
            <span className="font-medium">Tags:</span>{" "}
            {note?.tags && note.tags.length > 0 ? note.tags.join(", ") : "—"}
          </p>
        </div>
      </div>
    );
  }, []);

  if (isLoading && data.length === 0) {
    return (
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">Loading watchlist...</p>
      </div>
    );
  }

  if (!isLoading && data.length === 0) {
    return (
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">No stocks in your watchlist. Please add some.</p>
      </div>
    );
  }

  return (
    <div className="shadow-sm">
      <MaterialReactTable
        columns={columns}
        data={data}
        state={{ isLoading }}
        enableRowActions
        enableExpanding
        positionActionsColumn="last"
        renderRowActions={({ row }) => (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Remove from watchlist">
              <IconButton size="small" onClick={() => handleRemove(row.original)}>
                <Star className="h-4 w-4 text-amber-600 fill-amber-500" />
              </IconButton>
            </Tooltip>
            <AlertsDialog stockName={row.original.name} />
          </div>
        )}
        renderDetailPanel={renderDetailPanel}
        muiTopToolbarProps={{
          sx: {
            backgroundColor: "#e5e7eb",
            paddingY: 1,
            paddingX: 2,
          },
        }}
        muiTableHeadCellProps={{
          sx: {
            backgroundColor: "#e5e7eb",
          },
        }}
        muiTableBodyRowProps={({ row }) => ({
          sx: {
            cursor: "pointer",
            backgroundColor: "#fff",
          },
          onClick: () => navigate(`/stock-details/${row.original.ticker}`),
        })}
        muiBottomToolbarProps={{
          sx: {
            backgroundColor: "#e5e7eb",
          },
        }}
      />
    </div>
  );
}
