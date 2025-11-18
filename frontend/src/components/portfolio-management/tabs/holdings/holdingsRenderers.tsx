// tabs/holdings/holdingsRenderers.tsx
import type { ApiHolding } from "../../types";
import { computeHoldingMetrics, formatCurrencySafe } from "./holdingsUtils";

interface RendererParams {
  holding: ApiHolding;
  portfolioCurrency: string;
}

export const renderInvested = ({ holding, portfolioCurrency }: RendererParams) => {
  const metrics = computeHoldingMetrics(holding);

  return (
    <div className="flex flex-col">
      <span>{formatCurrencySafe(metrics.investedPortfolio, portfolioCurrency)}</span>
      <span className="text-xs text-gray-500">
        ({formatCurrencySafe(metrics.investedInstrument, holding.instrument_ccy)})
      </span>
    </div>
  );
};

export const renderCurrentValue = ({ holding, portfolioCurrency }: RendererParams) => {
  const metrics = computeHoldingMetrics(holding);

  return (
    <div className="flex flex-col">
      <span>{formatCurrencySafe(metrics.currentPortfolio, portfolioCurrency)}</span>
      <span className="text-xs text-gray-500">
        ({formatCurrencySafe(metrics.currentInstrument, holding.instrument_ccy)})
      </span>
    </div>
  );
};

export const renderGainLoss = ({ holding, portfolioCurrency }: RendererParams) => {
  const metrics = computeHoldingMetrics(holding);

  return (
    <div className={`flex flex-col ${metrics.isPositive ? "text-green-600" : "text-red-600"}`}>
      <span>{formatCurrencySafe(metrics.gainPortfolio, portfolioCurrency)}</span>
      <span className="text-xs">
        ({formatCurrencySafe(metrics.gainInstrument, holding.instrument_ccy)})
      </span>
    </div>
  );
};
