// tabs/holdings/useHoldingsColumns.tsx
import { useMemo } from "react";
import type { MRT_ColumnDef } from "material-react-table";
import type { ApiHolding } from "../../types";

import { renderInvested, renderCurrentValue, renderGainLoss } from "./holdingsRenderers";

interface UseHoldingsColumnsOptions {
  portfolioCurrency?: string;
}

export function useHoldingsColumns(
  options?: UseHoldingsColumnsOptions
): MRT_ColumnDef<ApiHolding>[] {
  const { portfolioCurrency = "PLN" } = options ?? {};

  return useMemo<MRT_ColumnDef<ApiHolding>[]>(
    () => [
      { accessorKey: "ticker", header: "Symbol" },
      { accessorKey: "shares", header: "Shares" },

      {
        id: "invested",
        header: "Invested",
        Cell: ({ row }) =>
          renderInvested({
            holding: row.original,
            portfolioCurrency,
          }),
      },

      {
        id: "currentValue",
        header: "Current Value",
        Cell: ({ row }) =>
          renderCurrentValue({
            holding: row.original,
            portfolioCurrency,
          }),
      },

      {
        id: "gainLoss",
        header: "Gain / Loss",
        Cell: ({ row }) =>
          renderGainLoss({
            holding: row.original,
            portfolioCurrency,
          }),
      },
    ],
    [portfolioCurrency]
  );
}
