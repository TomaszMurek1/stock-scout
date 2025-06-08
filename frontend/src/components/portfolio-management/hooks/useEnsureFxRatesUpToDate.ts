import { useAppStore } from "@/store/appStore";
import { useCallback } from "react";
import { PortfolioStock } from "../types";

export function useEnsureFxRatesUpToDate(
    holdings: PortfolioStock[] = [],
    portfolioCurrency?: string | null
) {
    const getFxRates = useAppStore(state => state.getFxRates);

    const fetchNeededRates = useCallback(async () => {
        if (!portfolioCurrency || !holdings.length) return;
        debugger

        const pairs = new Set<string>();
        holdings.forEach(holding => {
            if (
                holding.currency &&
                holding.currency !== portfolioCurrency
            ) {
                const pairKey = `${holding.currency}-${portfolioCurrency}`;
                pairs.add(pairKey);
            }
        });

        await Promise.all(
            Array.from(pairs).map(async (pair) => {
                const [base, quote] = pair.split("-");
                try {
                    await getFxRates(base, quote);
                } catch (e) {
                    console.error(`Error fetching FX rate for ${base}/${quote}`, e);
                }
            })
        );
    }, [holdings, portfolioCurrency, getFxRates]);

    return fetchNeededRates;
}