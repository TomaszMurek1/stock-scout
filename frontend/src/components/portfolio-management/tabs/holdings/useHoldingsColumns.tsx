// tabs/holdings/useHoldingsColumns.tsx
import { useMemo } from "react";
import type { MRT_ColumnDef } from "material-react-table";
import type { ApiHolding } from "../../types";

import { renderInvested, renderCurrentValue, renderGainLoss } from "./holdingsRenderers";
import { API_URL } from "@/services/apiClient";

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
        accessorKey: "name",
        header: "Company",
        Cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <img
              src={`${API_URL}/stock-details/${row.original.ticker}/logo`}
              alt={row.original.ticker}
              className="w-8 h-8 object-contain bg-gray-200 rounded p-1"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="flex flex-col">
              <span className="font-medium">{row.original.name}</span>
              <span className="text-xs text-gray-500">{row.original.ticker}</span>
            </div>
          </div>
        ),
      },
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
