"use client";

import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MaterialReactTable, type MRT_Row } from "material-react-table";
import { IconButton, Tooltip } from "@mui/material";
import { Star, Bell } from "lucide-react";
import { AppState, useAppStore } from "@/store/appStore";
import type { WatchlistStock } from "./types";
import { apiClient } from "@/services/apiClient";
import { useWatchlistColumns } from "./useWatchlistColumns";
import AddAlertModal from "@/features/portfolio-management/modals/add-alert/AddAlertModal";
import { useTranslation } from "react-i18next";
import { useMrtLocalization } from "@/hooks/useMrtLocalization";

export function WatchlistTable() {
  const watchlist = useAppStore((state: AppState) => state.watchlist.data);
  const isLoading = useAppStore((state: AppState) => state.watchlist.isLoading);
  const toggleWatchlist = useAppStore((state: AppState) => state.toggleWatchlist);
  const refreshWatchlist = useAppStore((state: AppState) => state.refreshWatchlist);
  const navigate = useNavigate();
  const [alertModalTicker, setAlertModalTicker] = useState<string | null>(null);
  const { t } = useTranslation();
  const localization = useMrtLocalization();

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
                {t("portfolio.watchlist.market_data")}
              </p>
              <p>
                <span className="font-medium">{t("portfolio.watchlist.last_price")}:</span>{" "}
                {market_data?.last_price !== null && market_data?.last_price !== undefined
                  ? `${market_data.last_price} ${market_data?.currency ?? ""}`
                  : "—"}
              </p>
              <p>
                <span className="font-medium">{t("portfolio.watchlist.last_updated")}:</span>{" "}
                {market_data?.last_updated
                  ? new Date(market_data.last_updated).toLocaleString()
                  : "—"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-gray-900 border-b border-gray-200 pb-1 mb-2">
                {t("portfolio.watchlist.research_status")}
              </p>
              {note ? (
                <>
                  <p>
                    <span className="font-medium">{t("portfolio.watchlist.status")}:</span>{" "}
                    <span className="capitalize">{note.research_status?.replace("_", " ") ?? "—"}</span>
                  </p>
                  <p>
                    <span className="font-medium">{t("portfolio.watchlist.sentiment")}:</span>{" "}
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
                    <span className="font-medium">{t("portfolio.watchlist.tags")}:</span>{" "}
                    {note.tags && note.tags.length > 0 ? note.tags.join(", ") : "—"}
                  </p>
                  <p>
                    <span className="font-medium">{t("portfolio.watchlist.last_updated")}:</span>{" "}
                    {note.updated_at ? new Date(note.updated_at).toLocaleDateString() : "—"}
                  </p>
                </>
              ) : (
                <p className="text-gray-500 italic">{t("portfolio.watchlist.no_note")}</p>
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
                     <span className="font-medium text-xs uppercase text-gray-500">{t("watchlist.thesis")}</span>
                     <p className="text-gray-800 mt-0.5 whitespace-pre-wrap text-sm leading-relaxed line-clamp-4 hover:line-clamp-none transition-all">
                       {note.thesis}
                     </p>
                   </div>
                 )}

                 {note.next_catalyst && (
                   <div>
                      <span className="font-medium text-xs uppercase text-gray-500">{t("watchlist.next_catalyst")}</span>
                      <p className="text-gray-800 mt-0.5">{note.next_catalyst}</p>
                   </div>
                 )}

                 <div className="grid grid-cols-2 gap-4 pt-2">
                    {(note.target_price_low || note.target_price_high) && (
                        <div>
                            <span className="font-medium text-xs uppercase text-gray-500 block">{t("watchlist.target_price")}</span>
                            <span className="text-gray-800">
                                {note.target_price_low ?? "?"} - {note.target_price_high ?? "?"}
                            </span>
                        </div>
                    )}
                     
                    {note.risk_factors && (
                        <div>
                             <span className="font-medium text-xs uppercase text-gray-500 block">{t("watchlist.risk_factors")}</span>
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
        <p className="text-gray-600">{t("portfolio.watchlist.loading")}</p>
      </div>
    );
  }

  if (!isLoading && data.length === 0) {
    return (
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">{t("portfolio.watchlist.empty_state")}</p>
      </div>
    );
  }

  return (
    <div className="shadow-sm">
      <MaterialReactTable
        columns={columns}
        data={data}
        localization={localization}
        state={{ isLoading }}
        enableRowActions
        enableExpanding
        positionActionsColumn="last"
        renderRowActions={({ row }) => (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Tooltip title={t("portfolio.watchlist.remove_tooltip")}>
              <IconButton size="small" onClick={() => handleRemove(row.original)}>
                <Star className="h-4 w-4 text-amber-600 fill-amber-500" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t("common.set_alert")}>
                <IconButton size="small" onClick={(e) => {
                    e.stopPropagation();
                    setAlertModalTicker(row.original.ticker);
                }}>
                    <Bell className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                </IconButton>
            </Tooltip>
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
      
      {alertModalTicker && (
            <AddAlertModal
                isOpen={!!alertModalTicker}
                onClose={() => setAlertModalTicker(null)}
                defaultTicker={alertModalTicker}
                onSuccess={() => setAlertModalTicker(null)}
            />
      )}
    </div>
  );
}
