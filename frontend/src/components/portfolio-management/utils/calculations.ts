import type { HoldingItem } from "../types"
function getLatestFxRate(
    base: string,
    quote: string,
    fxRates: Record<string, { base: string; quote: string; historicalData: any[] }>
): number | null {
    const key = `${base}-${quote}`;
    const fxObj = fxRates[key];
    if (!fxObj || !fxObj.historicalData?.length) return null;
    // Find the latest date (or just last item if sorted)
    const latest = fxObj.historicalData[fxObj.historicalData.length - 1];
    return latest?.close ?? null;
}


export function calculateTotalValue(
    holdings: HoldingItem[],
    portfolioCurrency: string,
    fxRates: Record<string, any>
) {
    return holdings.reduce((sum, h) => {
        // If holding is already in portfolio currency, no conversion needed
        if (h.currency === portfolioCurrency) {
            return sum + h.last_price * h.shares;
        }
        // Else, convert using latest FX rate
        const fxRate = getLatestFxRate(h.currency, portfolioCurrency, fxRates);
        if (fxRate) {
            return sum + (h.last_price * h.shares * fxRate);
        }
        // If no FX rate, skip or fallback to 0 (could log/warn here)
        return sum;
    }, 0);
}

export function calculateTotalInvested(
    holdings: HoldingItem[],
    portfolioCurrency: string,
    fxRates: Record<string, any>
) {
    return holdings.reduce((sum, h) => {
        if (h.currency === portfolioCurrency) {
            return sum + h.average_price * h.shares;
        }
        const fxRate = getLatestFxRate(h.currency, portfolioCurrency, fxRates);
        if (fxRate) {
            return sum + (h.average_price * h.shares * fxRate);
        }
        return sum;
    }, 0);
}
export function calculateGainLoss(totalValue: number, totalInvested: number) {
    return totalValue - totalInvested
}

export function calculatePercentageChange(
    gainLoss: number,
    totalInvested: number
) {
    return totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0
}
