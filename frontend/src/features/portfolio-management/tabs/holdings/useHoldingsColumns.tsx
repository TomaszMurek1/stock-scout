import { useMemo } from "react";
import type { MRT_ColumnDef } from "material-react-table";
import { Link } from "react-router-dom";
import type { ApiHolding, Period } from "../../types";
import { renderInvested, renderCurrentValue, renderGainLoss, renderPeriodGainLoss } from "./holdingsRenderers";
import { API_URL } from "@/services/apiClient";
import { useTranslation } from "react-i18next";

interface UseHoldingsColumnsOptions {
  portfolioCurrency?: string;
  selectedPeriod: Period;
}

export function useHoldingsColumns(
  options: UseHoldingsColumnsOptions
): MRT_ColumnDef<ApiHolding>[] {
  const { portfolioCurrency = "PLN", selectedPeriod = "ytd" } = options ?? {};
  const { t } = useTranslation();

  return useMemo<MRT_ColumnDef<ApiHolding>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("portfolio.holdings.company"),
        Cell: ({ row }) => (
          <div 
             className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors"
             onClick={(e) => {
               e.stopPropagation();
               // We need navigation here. But `useHoldingsColumns` is a hook not currently taking navigate.
               // We can use <Link> from react-router-dom if we import it.
             }}
          >
           <Link to={`/stock-details/${row.original.ticker}`} className="flex items-center gap-2 w-full h-full text-inherit no-underline" onClick={(e) => e.stopPropagation()}>
            <img
              src={`${API_URL}/stock-details/${row.original.ticker}/logo`}
              alt={row.original.ticker}
              className="w-8 h-8 object-contain bg-gray-200 rounded p-1"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="flex flex-col">
              <span className="font-medium text-blue-600 hover:text-blue-800">{row.original.name}</span>
              <span className="text-xs text-gray-500">{row.original.ticker}</span>
            </div>
           </Link>
          </div>
        ),
      },
      { accessorKey: "shares", header: t("common.shares") },

      {
        id: "invested",
        header: t("portfolio.holdings.invested"),
        Cell: ({ row }) =>
          renderInvested({
            holding: row.original,
            portfolioCurrency,
          }),
        Footer: ({ table }) => {
          const total = table.getFilteredRowModel().rows.reduce((sum, row) => {
            return sum + row.original.shares * row.original.average_cost_portfolio_ccy;
          }, 0);
          return (
            <div className="font-bold text-gray-900 border-t-2 border-gray-300 pt-1">
              {total.toLocaleString(undefined, {
                style: "currency",
                currency: portfolioCurrency,
              })}
            </div>
          );
        },
      },

      {
        id: "currentValue",
        header: t("portfolio.holdings.current_value"),
        Cell: ({ row }) =>
          renderCurrentValue({
            holding: row.original,
            portfolioCurrency,
          }),
        Footer: ({ table }) => {
          const total = table.getFilteredRowModel().rows.reduce((sum, row) => {
            return (
              sum +
              row.original.shares *
                row.original.last_price *
                row.original.fx_rate_to_portfolio_ccy
            );
          }, 0);
          return (
            <div className="font-bold text-gray-900 border-t-2 border-gray-300 pt-1">
              {total.toLocaleString(undefined, {
                style: "currency",
                currency: portfolioCurrency,
              })}
            </div>
          );
        },
      },

      {
        id: "gainLoss",
        header: t("portfolio.holdings.gain_loss"),
        Cell: ({ row }) =>
          renderGainLoss({
            holding: row.original,
            portfolioCurrency,
          }),
        Footer: ({ table }) => {
          const total = table.getFilteredRowModel().rows.reduce((sum, row) => {
            const current =
              row.original.shares *
              row.original.last_price *
              row.original.fx_rate_to_portfolio_ccy;
            const cost =
              row.original.shares * row.original.average_cost_portfolio_ccy;
            return sum + (current - cost);
          }, 0);
          const color = total >= 0 ? "text-green-700" : "text-red-700";
          return (
            <div className={`font-bold ${color} border-t-2 border-gray-300 pt-1`}>
              {total > 0 ? "+" : ""}
              {total.toLocaleString(undefined, {
                style: "currency",
                currency: portfolioCurrency,
              })}
            </div>
          );
        },
      },
      {
        id: "periodGainLoss",
        header: `${t("portfolio.holdings.gain_loss")} (${selectedPeriod.toUpperCase()})`,
        Cell: ({ row }) =>
          renderPeriodGainLoss({
            holding: row.original,
            portfolioCurrency,
            period: selectedPeriod,
          }),
        Footer: ({ table }) => {
          const total = table.getFilteredRowModel().rows.reduce((sum, row) => {
            // Note: period_pnl is mainly a Record<string, number>, but TS might complain if undefined
            const pnl = row.original.period_pnl?.[selectedPeriod] ?? 0;
            return sum + pnl;
          }, 0);
          const color = total >= 0 ? "text-green-700" : "text-red-700";
          return (
            <div className={`font-bold ${color} border-t-2 border-gray-300 pt-1`}>
              {total > 0 ? "+" : ""}
              {total.toLocaleString(undefined, {
                style: "currency",
                currency: portfolioCurrency,
              })}
            </div>
          );
        },
      },
    ],
    [portfolioCurrency, selectedPeriod, t]
  );
}
