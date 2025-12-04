// src/hooks/usePortfolioData.ts
import { useShallow } from "zustand/react/shallow";
import { AppState, useAppStore } from "@/store/appStore";
export function usePortfolioBaseData() {
  return useAppStore(
    useShallow((state: AppState) => ({
      portfolio: state.portfolio,
      performance: state.performance,
      holdings: state.holdings,
      transactions: state.transactions,
      priceHistory: state.priceHistory,
      fxRates: state.fxRates,
      refreshPortfolio: state.refreshPortfolio,
      sell: state.sell,
    }))
  );
}
