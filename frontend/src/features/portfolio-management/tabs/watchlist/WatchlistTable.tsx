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
      <div className="w-full p-4 grid gap-6 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Left Column: Market Data & Status */}
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="font-semibold text-gray-900 border-b border-gray-200 pb-1 mb-2">
                Market Data
              </p>
              <p>
                <span className="font-medium">Last price:</span>{" "}
                {market_data?.last_price !== null && market_data?.last_price !== undefined
                  ? `${market_data.last_price} ${market_data?.currency ?? ""}`
                  : "—"}
              </p>
              <p>
                <span className="font-medium">Last updated:</span>{" "}
                {market_data?.last_updated
                  ? new Date(market_data.last_updated).toLocaleString()
                  : "—"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-gray-900 border-b border-gray-200 pb-1 mb-2">
                Research Status
              </p>
              {note ? (
                <>
                  <p>
                    <span className="font-medium">Status:</span>{" "}
                    <span className="capitalize">{note.research_status?.replace("_", " ") ?? "—"}</span>
                  </p>
                  <p>
                    <span className="font-medium">Sentiment:</span>{" "}
                    {note.sentiment_trend ? (
                      <span
                        className={`font-medium capitalize ${
                          note.sentiment_trend === "bullish"
                            ? "text-green-600"
                            : note.sentiment_trend === "bearish"
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {note.sentiment_trend}
                      </span>
                    ) : (
                      "—"
                    )}
                  </p>
                  <p>
                    <span className="font-medium">Tags:</span>{" "}
                    {note.tags && note.tags.length > 0 ? note.tags.join(", ") : "—"}
                  </p>
                  <p>
                    <span className="font-medium">Last Updated:</span>{" "}
                    {note.updated_at ? new Date(note.updated_at).toLocaleDateString() : "—"}
                  </p>
                </>
              ) : (
                <p className="text-gray-500 italic">No research note available.</p>
              )}
            </div>
          </div>

          {/* Right Column: Note Content */}
          {note && (
            <div className="space-y-4">
               <div className="space-y-2">
                 <p className="font-semibold text-gray-900 border-b border-gray-200 pb-1 mb-2">
                   {note.title || "Untitled Note"}
                 </p>
                 
                 {note.thesis && (
                   <div>
                     <span className="font-medium text-xs uppercase text-gray-500">Thesis</span>
                     <p className="text-gray-800 mt-0.5 whitespace-pre-wrap text-sm leading-relaxed line-clamp-4 hover:line-clamp-none transition-all">
                       {note.thesis}
                     </p>
                   </div>
                 )}

                 {note.next_catalyst && (
                   <div>
                      <span className="font-medium text-xs uppercase text-gray-500">Next Catalyst</span>
                      <p className="text-gray-800 mt-0.5">{note.next_catalyst}</p>
                   </div>
                 )}

                 <div className="grid grid-cols-2 gap-4 pt-2">
                    {(note.target_price_low || note.target_price_high) && (
                        <div>
                            <span className="font-medium text-xs uppercase text-gray-500 block">Target Price</span>
                            <span className="text-gray-800">
                                {note.target_price_low ?? "?"} - {note.target_price_high ?? "?"}
                            </span>
                        </div>
                    )}
                     
                    {note.risk_factors && (
                        <div>
                             <span className="font-medium text-xs uppercase text-gray-500 block">Risk Factors</span>
                             <p className="text-gray-800 line-clamp-2 hover:line-clamp-none text-xs">{note.risk_factors}</p>
                        </div>
                    )}
                 </div>
               </div>
            </div>
          )}
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
