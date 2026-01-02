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
        // Build price map
        const prices: Record<string, number> = {};
        
        holdings.forEach(h => {
             if (h.price) prices[h.ticker] = h.price; 
        });

        watchlistData.forEach(w => {
            if (w.market_data?.last_price) {
                prices[w.ticker] = w.market_data.last_price;
            }
        });

        // specific filtering logic
        return alerts.filter(alert => {
            // Must be unread and not snoozed
            if (alert.is_read) return false;
            if (alert.snoozed_until && new Date(alert.snoozed_until) > new Date()) return false;

            // Must be triggered
            const price = prices[alert.ticker];
            if (price === undefined) return false; // Can't trigger if no price data

            switch (alert.alert_type) {
                case AlertType.PRICE_ABOVE:
                    return price > alert.threshold_value;
                case AlertType.PRICE_BELOW:
                    return price < alert.threshold_value;
                default:
                    return false;
            }
        }).length;
    }, [alerts, holdings, watchlistData]);

    return activeCount;
};
