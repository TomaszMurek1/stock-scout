import { FC, useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useStockData } from "./hooks/useStockData";
import TradePanel from "./parts/trade-panel";
import AddStockModal from "../portfolio-management/modals/add-stock/AddStockModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoadingScreen from "@/components/shared/loading-screen";
import ErrorScreen from "@/components/shared/error-screen";
import { StockPageContent } from "./stock-page-content";

export const StockOnePager: FC = () => {
  const { ticker } = useParams();
  const [searchParams] = useSearchParams();
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [tradeAction, setTradeAction] = useState<"buy" | "sell">("buy");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const shortWindow = Number(searchParams.get("short_window") ?? 50);
  const longWindow = Number(searchParams.get("long_window") ?? 200);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [ticker]);

  const { stock, isLoading, error, isRefreshed } = useStockData(ticker, shortWindow, longWindow);

  const openBuyModal = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const openSellModal = useCallback(() => {
    setTradeAction("sell");
    setIsTradeModalOpen(true);
  }, []);

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={new Error(error)} />;
  if (!stock) return null;
  if (stock.delisted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg max-w-xl w-full p-8 text-center space-y-3">
          <p className="text-2xl font-semibold text-gray-900">{ticker} is delisted</p>
          <p className="text-gray-600">
            {stock.message || "This ticker is marked as delisted. No market data is available."}
          </p>
        </div>
      </div>
    );
  }

  const {
    executive_summary,
    company_overview,
    technical_analysis,
  } = stock;

  const latestPrice =
    technical_analysis.historical.length > 0
      ? technical_analysis.historical[technical_analysis.historical.length - 1].close
      : 0;

  return (
    <div className="min-h-screen bg-gray-100 text-slate-900">
      <StockPageContent
        stock={stock}
        ticker={ticker}
        shortWindow={shortWindow}
        longWindow={longWindow}
        isRefreshed={isRefreshed}
        onBuyClick={openBuyModal}
        onSellClick={openSellModal}
      />

      <Dialog open={isTradeModalOpen} onOpenChange={setIsTradeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tradeAction === "buy" ? "Buy" : "Sell"} {ticker}
            </DialogTitle>
            <DialogDescription>
              You are about to {tradeAction} shares of {executive_summary.name}.
            </DialogDescription>
          </DialogHeader>
          <TradePanel
            companyId={company_overview.id}
            currentPrice={latestPrice}
            action={tradeAction}
            onTrade={() => setIsTradeModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        initialTicker={ticker}
        initialName={executive_summary.name || undefined}
        initialCurrency={executive_summary.currency || undefined}
        initialPrice={latestPrice}
      />
    </div>
  );
};
