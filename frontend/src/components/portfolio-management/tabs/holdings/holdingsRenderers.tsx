// tabs/holdings/holdingsRenderers.tsx
import type { ApiHolding } from "../../types";
import { computeHoldingMetrics, formatCurrencySafe } from "./holdingsUtils";

interface RendererParams {
  holding: ApiHolding;
  portfolioCurrency: string;
}

export const renderInvested = ({ holding, portfolioCurrency }: RendererParams) => {
  const metrics = computeHoldingMetrics(holding);
  const isSameCurrency = holding.instrument_ccy === portfolioCurrency;

  return (
    <div className="flex flex-col">
      <span>{formatCurrencySafe(metrics.investedPortfolio, portfolioCurrency)}</span>
      {!isSameCurrency && (
        <span className="text-xs text-gray-500">
          ({formatCurrencySafe(metrics.investedInstrument, holding.instrument_ccy)})
        </span>
      )}
    </div>
  );
};

export const renderCurrentValue = ({ holding, portfolioCurrency }: RendererParams) => {
  const metrics = computeHoldingMetrics(holding);
  const isSameCurrency = holding.instrument_ccy === portfolioCurrency;

  return (
    <div className="flex flex-col">
      <span>{formatCurrencySafe(metrics.currentPortfolio, portfolioCurrency)}</span>
      {!isSameCurrency && (
        <span className="text-xs text-gray-500">
          ({formatCurrencySafe(metrics.currentInstrument, holding.instrument_ccy)})
        </span>
      )}
    </div>
  );
};

export const renderGainLoss = ({ holding, portfolioCurrency }: RendererParams) => {
  const metrics = computeHoldingMetrics(holding);
  const isSameCurrency = holding.instrument_ccy === portfolioCurrency;

  return (
    <div className={`flex flex-col ${metrics.isPositive ? "text-green-600" : "text-red-600"}`}>
      <span>{formatCurrencySafe(metrics.gainPortfolio, portfolioCurrency)}</span>
      {!isSameCurrency && (
        <span className="text-xs">
          ({formatCurrencySafe(metrics.gainInstrument, holding.instrument_ccy)})
        </span>
      )}
    </div>
  );
};

export const renderPeriodGainLoss = ({ holding, portfolioCurrency, period }: RendererParams & { period: string }) => {
  // period_pnl is a map: { "1d": val, "1m": val, ... }
  const periodPnl = holding.period_pnl?.[period] || 0;
  const isPositive = periodPnl >= 0;
  
  const isSameCurrency = holding.instrument_ccy === portfolioCurrency;
  const periodPnlInstrument = holding.period_pnl_instrument_ccy?.[period] || 0;


  return (
    <div className={`flex flex-col ${isPositive ? "text-green-600" : "text-red-600"}`}>
      <span>{formatCurrencySafe(periodPnl, portfolioCurrency)}</span>
      {!isSameCurrency && (
        <span className="text-xs">
          ({formatCurrencySafe(periodPnlInstrument, holding.instrument_ccy)})
        </span>
      )}
    </div>
  );
};
