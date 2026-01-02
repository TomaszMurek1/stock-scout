import { useAppStore } from "@/store/appStore";
import { AlertType } from "../types/alert.types";
import { useShallow } from "zustand/react/shallow";
import { useMemo } from "react";

export const useActiveAlertsCount = () => {
    const { alerts, portfolioHoldings, watchlist } = useAppStore(
        useShallow((state) => ({
            alerts: state.alerts,
            portfolioHoldings: state.portfolio.data?.holdings,
            watchlist: state.watchlist.data
        }))
    );
    
    const holdings = portfolioHoldings || [];
    const watchlistData = watchlist || [];

    const activeCount = useMemo(() => {
        // Build data maps
        const prices: Record<string, number> = {};
        const smas: Record<string, { sma50?: number, sma200?: number }> = {};
        
        holdings.forEach(h => {
             if (h.price) prices[h.ticker] = h.price;
             // Some holdings might have SMAs directly on them or in market_data
             // types are loose here, so we check safely
             if ((h as any).sma_50 || (h as any).sma_200) {
                 smas[h.ticker] = { sma50: (h as any).sma_50, sma200: (h as any).sma_200 };
             }
        });

        watchlistData.forEach(w => {
            if (w.market_data?.last_price) {
                prices[w.ticker] = w.market_data.last_price;
            }
            if ((w.market_data as any)?.sma_50 || (w.market_data as any)?.sma_200) {
                 smas[w.ticker] = { 
                     ...smas[w.ticker],
                     sma50: (w.market_data as any).sma_50 || smas[w.ticker]?.sma50,
                     sma200: (w.market_data as any).sma_200 || smas[w.ticker]?.sma200
                 };
            }
        });

        // specific filtering logic
        return alerts.filter(alert => {
            // Must be unread and not snoozed
            if (alert.is_read) return false;
            if (alert.snoozed_until && new Date(alert.snoozed_until) > new Date()) return false;

            const price = prices[alert.ticker];
            const smaData = smas[alert.ticker];

            switch (alert.alert_type) {
                case AlertType.PRICE_ABOVE:
                    return price !== undefined && price > alert.threshold_value;
                case AlertType.PRICE_BELOW:
                    return price !== undefined && price < alert.threshold_value;
                case AlertType.PERCENT_CHANGE_UP:
                    // Need reference price (e.g. open/close prev day) to compute % change, 
                    // for now skipping or simple price check if that was intent
                    return false; 
                case AlertType.SMA_50_ABOVE_SMA_200:
                    if (smaData?.sma50 && smaData?.sma200) {
                        return smaData.sma50 > smaData.sma200;
                    }
                    return false;
                case AlertType.SMA_50_BELOW_SMA_200:
                    if (smaData?.sma50 && smaData?.sma200) {
                        return smaData.sma50 < smaData.sma200;
                    }
                    return false;
                case AlertType.SMA_50_APPROACHING_SMA_200:
                    if (smaData?.sma50 && smaData?.sma200) {
                        const diff = Math.abs(smaData.sma50 - smaData.sma200);
                        const percentDiff = (diff / smaData.sma200) * 100;
                        return percentDiff <= Number(alert.threshold_value);
                    }
                    return false;
                default:
                    return false;
            }
        }).length;
    }, [alerts, holdings, watchlistData]);

    return activeCount;
};
