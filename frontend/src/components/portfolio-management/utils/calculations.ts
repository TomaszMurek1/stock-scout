import type { HoldingItem } from "../types"

export function calculateTotalValue(holdings: HoldingItem[]) {
    return holdings.reduce((sum, h) => sum + h.last_price * h.shares, 0)
}

export function calculateTotalInvested(holdings: HoldingItem[]) {
    return holdings.reduce((sum, h) => sum + h.average_price * h.shares, 0)
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
