
import { apiClient } from "@/services/apiClient";


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
    getFxRatesBatch: (pairs: [string, string][]) => Promise<CurrencyRate[]>;

}
export const createFxRatesSlice = (set: any): FxRatesSlice => ({
    fxRates: {},
    fxRatesLastUpdated: {},
    getFxRatesBatch: async (pairs: [string, string][]) => {
        const today = new Date().toISOString().slice(0, 10);
        const { data } = await apiClient.post<Record<string, CurrencyRate[]>>(
            '/fx-rate/batch',
            {
                pairs,
                start: today,
                end: today,
            }
        );
        set((state: any) => {
            const updatedFxRates = { ...state.fxRates };
            const updatedFxRatesLastUpdated = { ...state.fxRatesLastUpdated };
            for (const pairKey in data) {
                updatedFxRates[pairKey] = data[pairKey];
                updatedFxRatesLastUpdated[pairKey] = today;
            }
            return {
                fxRates: updatedFxRates,
                fxRatesLastUpdated: updatedFxRatesLastUpdated,
            };
        });
        return data;
    },

});
