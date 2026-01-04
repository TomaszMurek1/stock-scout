"use client";
import { useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { WatchlistTable } from "./WatchlistTable";
import { AppState, useAppStore } from "@/store/appStore";
import { AddWatchlistDialog } from "./AddWatchlistDialog";
import { useTranslation } from "react-i18next";

export default function WatchlistTab() {
  const loadWatchlist = useAppStore((state: AppState) => state.loadWatchlist);
  const refreshWatchlist = useAppStore((state: AppState) => state.refreshWatchlist);
  const isLoading = useAppStore((state: AppState) => state.watchlist.isLoading);
  const { t } = useTranslation();

  const handleRefresh = useCallback(() => {
    refreshWatchlist().catch((err) => {
      console.error("Failed to refresh watchlist", err);
    });
  }, [refreshWatchlist]);

  useEffect(() => {
    console.log("Loading watchlist...");
    loadWatchlist().catch((err) => {
      console.error("Failed to load watchlist", err);
    });
  }, [loadWatchlist]);

  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">{t("portfolio.watchlist.title")}</h2>
        <div className="flex space-x-2">
          <AddWatchlistDialog />
          <Button
            variant="outline"
            size="sm"
            className="text-gray-600"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("common.refresh")}
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <WatchlistTable />
      </div>
    </div>
  );
}
