"use client";

import React, { useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { MaterialReactTable, type MRT_ColumnDef, type MRT_Row } from "material-react-table";
import type { ClosedPosition } from "../../types";
import { useTranslation } from "react-i18next";
import { useMrtLocalization } from "@/hooks/useMrtLocalization";
import { API_URL } from "@/services/apiClient";
import { formatCurrency } from "@/utils/formatting";

/** Grouped row: one per ticker */
interface ClosedPositionGroup {
  ticker: string;
  name: string;
  instrument_ccy: string;
  total_quantity: number;
  total_proceeds_pcy: number;
  total_proceeds_icy: number;
  total_cost_basis_pcy: number;
  total_cost_basis_icy: number;
  total_realized_pnl: number;
  total_realized_pnl_icy: number;
  realized_pnl_pct: number;
  sell_count: number;
  last_sell_date: string;
  sells: ClosedPosition[];
}

interface ClosedPositionsTabProps {
  closedPositions: ClosedPosition[];
  portfolioCurrency?: string;
  isLoading?: boolean;
}

function groupByTicker(positions: ClosedPosition[]): ClosedPositionGroup[] {
  const map: Record<string, ClosedPositionGroup> = {};

  for (const p of positions) {
    const key = p.ticker.toUpperCase();
    if (!map[key]) {
      map[key] = {
        ticker: p.ticker,
        name: p.name,
        instrument_ccy: p.sell_currency,
        total_quantity: 0,
        total_proceeds_pcy: 0,
        total_proceeds_icy: 0,
        total_cost_basis_pcy: 0,
        total_cost_basis_icy: 0,
        total_realized_pnl: 0,
        total_realized_pnl_icy: 0,
        realized_pnl_pct: 0,
        sell_count: 0,
        last_sell_date: p.sell_date,
        sells: [],
      };
    }
    const g = map[key];
    g.total_quantity += p.quantity;
    g.total_proceeds_pcy += p.proceeds_pcy;
    g.total_proceeds_icy += p.proceeds_icy;
    g.total_cost_basis_pcy += p.cost_basis_pcy;
    g.total_cost_basis_icy += p.cost_basis_icy;
    g.total_realized_pnl += p.realized_pnl;
    g.total_realized_pnl_icy += p.realized_pnl_icy;
    g.sell_count += 1;
    if (p.sell_date > g.last_sell_date) g.last_sell_date = p.sell_date;
    g.sells.push(p);
  }

  for (const g of Object.values(map)) {
    g.realized_pnl_pct =
      g.total_cost_basis_pcy !== 0
        ? Math.round((g.total_realized_pnl / g.total_cost_basis_pcy) * 10000) / 100
        : 0;
  }

  return Object.values(map).sort((a, b) => b.last_sell_date.localeCompare(a.last_sell_date));
}

/** Dual-currency cell helper — matches HoldingsTab pattern */
const DualCurrencyCell = ({
  valuePcy,
  valueIcy,
  portfolioCurrency,
  instrumentCurrency,
  className = "",
}: {
  valuePcy: number;
  valueIcy: number;
  portfolioCurrency: string;
  instrumentCurrency: string;
  className?: string;
}) => {
  const isSameCurrency = instrumentCurrency === portfolioCurrency;
  return (
    <div className={`flex flex-col ${className}`}>
      <span>{formatCurrency(valuePcy, portfolioCurrency)}</span>
      {!isSameCurrency && (
        <span className="text-xs text-gray-500">
          ({formatCurrency(valueIcy, instrumentCurrency)})
        </span>
      )}
    </div>
  );
};

const ClosedPositionsTab = React.memo(
  ({ closedPositions, portfolioCurrency = "PLN", isLoading }: ClosedPositionsTabProps) => {
    const { t } = useTranslation();
    const localization = useMrtLocalization();

    const grouped = useMemo(() => groupByTicker(closedPositions), [closedPositions]);

    const columns = useMemo<MRT_ColumnDef<ClosedPositionGroup>[]>(
      () => [
        {
          accessorKey: "ticker",
          header: t("portfolio.holdings.stock", { defaultValue: "Stock" }),
          Cell: ({ row }) => (
            <Link
              to={`/stock-details/${row.original.ticker}`}
              className="flex items-center gap-3 group no-underline"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={`${API_URL}/stock-details/${row.original.ticker}/logo`}
                alt={row.original.ticker}
                className="w-8 h-8 object-contain bg-gray-200 border border-gray-100 rounded-md p-0.5"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="flex flex-col">
                <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {row.original.name}
                </span>
                <span className="text-xs text-gray-500 font-medium">{row.original.ticker}</span>
              </div>
            </Link>
          ),
          size: 220,
        },
        {
          accessorKey: "total_quantity",
          header: t("portfolio.closed.shares_sold", { defaultValue: "Shares Sold" }),
          Cell: ({ cell }) => (
            <span className="font-medium text-gray-700">{cell.getValue<number>().toLocaleString()}</span>
          ),
          size: 100,
        },
        {
          accessorKey: "total_cost_basis_pcy",
          header: t("portfolio.closed.cost_basis", { defaultValue: "Cost Basis" }),
          Cell: ({ row }) => (
            <DualCurrencyCell
              valuePcy={row.original.total_cost_basis_pcy}
              valueIcy={row.original.total_cost_basis_icy}
              portfolioCurrency={portfolioCurrency}
              instrumentCurrency={row.original.instrument_ccy}
              className="font-medium text-gray-700"
            />
          ),
          size: 150,
        },
        {
          accessorKey: "total_proceeds_pcy",
          header: t("portfolio.closed.proceeds", { defaultValue: "Proceeds" }),
          Cell: ({ row }) => (
            <DualCurrencyCell
              valuePcy={row.original.total_proceeds_pcy}
              valueIcy={row.original.total_proceeds_icy}
              portfolioCurrency={portfolioCurrency}
              instrumentCurrency={row.original.instrument_ccy}
              className="font-medium text-gray-700"
            />
          ),
          size: 150,
        },
        {
          accessorKey: "total_realized_pnl",
          header: t("portfolio.closed.realized_pnl", { defaultValue: "Realized P/L" }),
          Cell: ({ row }) => {
            const val = row.original.total_realized_pnl;
            const color = val >= 0 ? "text-green-600" : "text-red-600";
            return (
              <DualCurrencyCell
                valuePcy={row.original.total_realized_pnl}
                valueIcy={row.original.total_realized_pnl_icy}
                portfolioCurrency={portfolioCurrency}
                instrumentCurrency={row.original.instrument_ccy}
                className={`font-semibold ${color}`}
              />
            );
          },
          size: 150,
        },
        {
          accessorKey: "realized_pnl_pct",
          header: "%",
          Cell: ({ cell }) => {
            const val = cell.getValue<number>();
            const color = val >= 0 ? "text-green-600" : "text-red-600";
            return (
              <span className={`font-semibold ${color}`}>
                {val >= 0 ? "+" : ""}{val.toFixed(2)}%
              </span>
            );
          },
          size: 80,
        },
        {
          accessorKey: "last_sell_date",
          header: t("portfolio.closed.last_sell", { defaultValue: "Last Sold" }),
          Cell: ({ cell }) => (
            <span className="text-gray-600">
              {new Date(cell.getValue<string>()).toLocaleDateString()}
            </span>
          ),
          size: 110,
        },
      ],
      [portfolioCurrency, t]
    );

    const renderDetailPanel = useCallback(
      ({ row }: { row: MRT_Row<ClosedPositionGroup> }) => {
        const sells = row.original.sells;
        const instrumentCcy = row.original.instrument_ccy;
        const isSameCurrency = instrumentCcy === portfolioCurrency;
        if (sells.length === 0) return null;

        return (
          <div className="w-full overflow-x-auto bg-gray-50 border border-gray-200 rounded-md p-4">
            <table className="w-full text-sm text-gray-700">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4 font-semibold">
                    {t("portfolio.closed.sell_date", { defaultValue: "Sell Date" })}
                  </th>
                  <th className="py-2 pr-4 font-semibold">
                    {t("common.shares", { defaultValue: "Shares" })}
                  </th>
                  <th className="py-2 pr-4 font-semibold">
                    {t("portfolio.closed.sell_price", { defaultValue: "Sell Price" })}
                  </th>
                  <th className="py-2 pr-4 font-semibold">
                    {t("portfolio.closed.proceeds", { defaultValue: "Proceeds" })}
                  </th>
                  <th className="py-2 pr-4 font-semibold">
                    {t("portfolio.closed.cost_basis", { defaultValue: "Cost Basis" })}
                  </th>
                  <th className="py-2 pr-4 font-semibold">
                    {t("portfolio.closed.realized_pnl", { defaultValue: "P/L" })}
                  </th>
                  <th className="py-2 pr-4 font-semibold">%</th>
                  <th className="py-2 pr-4 font-semibold">
                    {t("portfolio.closed.holding_period", { defaultValue: "Held" })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sells.map((s, i) => {
                  const pnlColor = s.realized_pnl >= 0 ? "text-green-600" : "text-red-600";
                  return (
                    <tr key={i} className="border-t border-gray-200">
                      <td className="py-2 pr-4">
                        {new Date(s.sell_date).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-4">{s.quantity.toLocaleString()}</td>
                      <td className="py-2 pr-4">
                        {s.sell_price.toFixed(2)}{" "}
                        <span className="text-gray-400 text-xs">{s.sell_currency}</span>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-col">
                          <span>{formatCurrency(s.proceeds_pcy, portfolioCurrency)}</span>
                          {!isSameCurrency && (
                            <span className="text-xs text-gray-500">
                              ({formatCurrency(s.proceeds_icy, instrumentCcy)})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-col">
                          <span>{formatCurrency(s.cost_basis_pcy, portfolioCurrency)}</span>
                          {!isSameCurrency && (
                            <span className="text-xs text-gray-500">
                              ({formatCurrency(s.cost_basis_icy, instrumentCcy)})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`py-2 pr-4 font-semibold ${pnlColor}`}>
                        <div className="flex flex-col">
                          <span>{formatCurrency(s.realized_pnl, portfolioCurrency)}</span>
                          {!isSameCurrency && (
                            <span className="text-xs">
                              ({formatCurrency(s.realized_pnl_icy, instrumentCcy)})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`py-2 pr-4 font-semibold ${pnlColor}`}>
                        {s.realized_pnl_pct >= 0 ? "+" : ""}
                        {s.realized_pnl_pct.toFixed(2)}%
                      </td>
                      <td className="py-2 pr-4 text-gray-500">
                        {s.holding_period_days != null
                          ? `${s.holding_period_days}d`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      },
      [portfolioCurrency, t]
    );

    if (isLoading && (!closedPositions || closedPositions.length === 0)) {
      return (
        <div className="space-y-4 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      );
    }

    if (!closedPositions || closedPositions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">
            {t("portfolio.closed.empty_title", { defaultValue: "No Closed Positions" })}
          </h3>
          <p className="text-sm text-gray-500 max-w-sm">
            {t("portfolio.closed.empty_description", {
              defaultValue: "When you sell stocks, they'll appear here with your realized profit/loss.",
            })}
          </p>
        </div>
      );
    }

    // Summary row
    const totalPnl = grouped.reduce((s, g) => s + g.total_realized_pnl, 0);
    const totalCost = grouped.reduce((s, g) => s + g.total_cost_basis_pcy, 0);
    const totalPnlPct = totalCost !== 0 ? (totalPnl / totalCost) * 100 : 0;
    const summaryColor = totalPnl >= 0 ? "text-green-600" : "text-red-600";

    return (
      <div className="shadow-sm">
        {/* Summary banner */}
        <div className="bg-white border border-gray-200 rounded-t-lg px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">
              {t("portfolio.closed.total_realized", { defaultValue: "Total Realized P/L" })}:
            </span>
            <span className={`text-lg font-bold ${summaryColor}`}>
              {formatCurrency(totalPnl, portfolioCurrency)}
            </span>
            <span className={`text-sm font-semibold ${summaryColor}`}>
              ({totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%)
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {grouped.length} {t("portfolio.closed.stocks", { defaultValue: "stocks" })} · {closedPositions.length} {t("portfolio.closed.trades", { defaultValue: "trades" })}
          </span>
        </div>

        <MaterialReactTable
          columns={columns}
          data={grouped}
          localization={localization}
          enableExpanding
          enableTopToolbar={true}
          enableBottomToolbar={true}
          enableColumnActions={false}
          enablePagination={true}
          enableSorting={true}
          state={{ isLoading }}
          initialState={{
            sorting: [{ id: "last_sell_date", desc: true }],
            pagination: { pageSize: 15, pageIndex: 0 },
            density: "compact",
          }}
          renderDetailPanel={renderDetailPanel}
          muiTableBodyRowProps={{
            sx: { backgroundColor: "#fff" },
          }}
          muiTopToolbarProps={{
            sx: { backgroundColor: "#e5e7eb", paddingY: 1, paddingX: 2 },
          }}
          muiTableHeadCellProps={{
            sx: { backgroundColor: "#e5e7eb" },
          }}
          muiBottomToolbarProps={{
            sx: { backgroundColor: "#e5e7eb" },
          }}
        />
      </div>
    );
  }
);

export default ClosedPositionsTab;
