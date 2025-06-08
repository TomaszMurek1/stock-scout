import { useAppStore } from "@/store/appStore";
import { useCallback } from "react";
import { PortfolioStock } from "../types";

export function useEnsureFxRatesUpToDate(
    holdings: PortfolioStock[] = [],
    portfolioCurrency?: string | null
) {
    const getFxRatesBatch = useAppStore(state => state.getFxRatesBatch);

    const fetchNeededRates = useCallback(async () => {
        if (!portfolioCurrency || !holdings.length) return;

        const pairs: [string, string][] = [];
        const seen = new Set<string>();
        holdings.forEach(holding => {
            if (
                holding.currency &&
                holding.currency !== portfolioCurrency
            ) {
                const pairKey = `${holding.currency}-${portfolioCurrency}`;
                if (!seen.has(pairKey)) {
                    pairs.push([holding.currency, portfolioCurrency]);
                    seen.add(pairKey);
                }
            }
        });

        if (pairs.length) {
            try {
                await getFxRatesBatch(pairs);
            } catch (e) {
                console.error(`Error fetching batch FX rates`, e);
            }
        }
    }, [holdings, portfolioCurrency, getFxRatesBatch]);

    return fetchNeededRates;
}