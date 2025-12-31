
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
    fxRates: Record<string, CurrencyRate[]>;
    fxRatesLastUpdated: Record<string, string>;
    setFxRates: (data: Record<string, CurrencyRate[]>) => void;
}

export const createFxRatesSlice = (set: any): FxRatesSlice => ({
    fxRates: {},
    fxRatesLastUpdated: {},
    setFxRates: (data: Record<string, CurrencyRate[]>) => {
        const today = new Date().toISOString().slice(0, 10);
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
    },
});
