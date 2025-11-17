// tabs/holdings/holdingsUtils.ts
import type { ApiHolding } from "../../types";

export interface HoldingMetrics {
  investedInstrument: number;
  investedPortfolio: number;
  currentInstrument: number;
  currentPortfolio: number;
  gainInstrument: number;
  gainPortfolio: number;
  isPositive: boolean;
}

export function computeHoldingMetrics(holding: ApiHolding): HoldingMetrics {
  const {
    shares,
    average_cost_instrument_ccy,
    average_cost_portfolio_ccy,
    last_price,
    fx_rate_to_portfolio_ccy,
  } = holding;

  const investedInstrument = shares * average_cost_instrument_ccy;
  const investedPortfolio = shares * average_cost_portfolio_ccy;

  const currentInstrument = shares * last_price;
  const currentPortfolio = shares * last_price * fx_rate_to_portfolio_ccy;

  const gainInstrument = currentInstrument - investedInstrument;
  const gainPortfolio = currentPortfolio - investedPortfolio;

  return {
    investedInstrument,
    investedPortfolio,
    currentInstrument,
    currentPortfolio,
    gainInstrument,
    gainPortfolio,
    isPositive: gainInstrument >= 0,
  };
}

export function formatCurrencySafe(value: number, currency: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  try {
    return value.toLocaleString(undefined, {
      style: "currency",
      currency,
    });
  } catch {
    // Fallback in case of weird currency codes
    return `${value.toFixed(2)} ${currency}`;
  }
}
