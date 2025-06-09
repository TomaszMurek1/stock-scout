// src/hooks/usePortfolioData.ts
import { useShallow } from "zustand/react/shallow";
import { AppState, useAppStore } from "@/store/appStore";
export function usePortfolioBaseData() {
    return useAppStore(
        useShallow((state: AppState) => ({
            portfolio: state.portfolio,
            holdings: state.holdings,
            transactions: state.transactions,
            currencyRates: state.currencyRates,
            priceHistory: state.priceHistory,
            refreshPortfolio: state.refreshPortfolio,
            sell: state.sell,
        }))
    );
}