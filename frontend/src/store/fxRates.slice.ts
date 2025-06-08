
import { apiClient } from "@/services/apiClient";
import { StateCreator } from "zustand";


export interface CurrencyRate {
    base: string;
    quote: string;
    date: string; // ISO string
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface FxRatesSlice {
    fxRates: Record<string, CurrencyRate[]>; // "PLN-USD" -> array of rates
    fxRatesLastUpdated: Record<string, string>; // "PLN-USD" -> last ISO date
    getFxRates: (base: string, quote: string) => Promise<CurrencyRate[]>;

}
export const createFxRatesSlice = (set: any, get: any): FxRatesSlice => ({
    fxRates: {},
    fxRatesLastUpdated: {},


    getFxRates: async (base, quote) => {
        const pairKey = `${base}-${quote}`;
        const today = new Date().toISOString().slice(0, 10);
        const stored = get().fxRates[pairKey];
        if (stored && get().fxRatesLastUpdated[pairKey] === today) {
            return stored;
        }
        // This GET will both update (if missing) and fetch
        const { data } = await apiClient.get<CurrencyRate[]>(`/fx-rate/${base}/${quote}?start=${today}&end=${today}`);
        set((state: any) => ({
            fxRates: { ...state.fxRates, [pairKey]: data },
            fxRatesLastUpdated: { ...state.fxRatesLastUpdated, [pairKey]: today },
        }));
        return data;
    },

});
