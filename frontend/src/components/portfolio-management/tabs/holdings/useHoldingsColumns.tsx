// tabs/holdings/useHoldingsColumns.tsx
import { useMemo } from "react";
import type { MRT_ColumnDef } from "material-react-table";
import type { ApiHolding } from "../../types";
import { computeHoldingMetrics, formatCurrencySafe } from "./holdingsUtils";

interface UseHoldingsColumnsOptions {
  portfolioCurrency?: string;
}

export function useHoldingsColumns(
  options?: UseHoldingsColumnsOptions
): MRT_ColumnDef<ApiHolding>[] {
  const { portfolioCurrency = "PLN" } = options ?? {};

  return useMemo<MRT_ColumnDef<ApiHolding>[]>(
    () => [
      {
        accessorKey: "ticker",
        header: "Symbol",
      },
      {
        accessorKey: "shares",
        header: "Shares",
      },
      {
        id: "invested",
        header: "Invested",
        Cell: ({ row }) => {
          const metrics = computeHoldingMetrics(row.original);
          const { investedPortfolio, investedInstrument } = {
            investedPortfolio: metrics.investedPortfolio,
            investedInstrument: metrics.investedInstrument,
          };

          return (
            <div className="flex flex-col">
              <span>{formatCurrencySafe(investedPortfolio, portfolioCurrency)}</span>
              <span className="text-xs text-gray-500">
                ({formatCurrencySafe(investedInstrument, row.original.instrument_ccy)})
              </span>
            </div>
          );
        },
      },
      {
        id: "currentValue",
        header: "Current Value",
        Cell: ({ row }) => {
          const metrics = computeHoldingMetrics(row.original);
          const { currentPortfolio, currentInstrument } = {
            currentPortfolio: metrics.currentPortfolio,
            currentInstrument: metrics.currentInstrument,
          };

          return (
            <div className="flex flex-col">
              <span>{formatCurrencySafe(currentPortfolio, portfolioCurrency)}</span>
              <span className="text-xs text-gray-500">
                ({formatCurrencySafe(currentInstrument, row.original.instrument_ccy)})
              </span>
            </div>
          );
        },
      },
      {
        id: "gainLoss",
        header: "Gain / Loss",
        Cell: ({ row }) => {
          const metrics = computeHoldingMetrics(row.original);
          const { gainPortfolio, gainInstrument, isPositive } = metrics;

          return (
            <div className={`flex flex-col ${isPositive ? "text-green-600" : "text-red-600"}`}>
              <span>{formatCurrencySafe(gainPortfolio, portfolioCurrency)}</span>
              <span className="text-xs">
                ({formatCurrencySafe(gainInstrument, row.original.instrument_ccy)})
              </span>
            </div>
          );
        },
      },
    ],
    [portfolioCurrency]
  );
}
