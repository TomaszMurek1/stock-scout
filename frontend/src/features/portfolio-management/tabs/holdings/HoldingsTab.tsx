"use client";

import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MaterialReactTable, type MRT_Row } from "material-react-table";
import { Trash2, Bell } from "lucide-react";
import { IconButton, Tooltip } from "@mui/material";
import AddAlertModal from "@/features/portfolio-management/modals/add-alert/AddAlertModal";
import { useState } from "react";
import type { ApiHolding, Transaction, Period } from "../../types";
import { useHoldingsColumns } from "./useHoldingsColumns";
import { HoldingsEmptyState } from "./HoldingsEmptyState";

interface HoldingsTabProps {
  holdings: ApiHolding[];
  transactions: Transaction[];
  onRemove: (ticker: string) => void;
  isLoading?: boolean;
  selectedPeriod?: Period;
}

export default function HoldingsTab({ holdings, transactions, onRemove, isLoading, selectedPeriod = "ytd" }: HoldingsTabProps) {
  const navigate = useNavigate();
  const [alertModalTicker, setAlertModalTicker] = useState<string | null>(null);
  const columns = useHoldingsColumns({ selectedPeriod });

  const groupedHoldings = useMemo(() => {
    if (!holdings) return [];
    
    const groups: Record<string, ApiHolding> = {};

    for (const h of holdings) {
      const key = h.ticker.toUpperCase();
      if (!groups[key]) {
        // Clone to avoid mutating original if needed, though here we're creating new object structure effectively
        groups[key] = { ...h }; 
        // Ensure PnL objects are cloned so we can sum into them safely
        groups[key].period_pnl = { ...h.period_pnl };
        groups[key].period_pnl_instrument_ccy = { ...h.period_pnl_instrument_ccy };
      } else {
        const existing = groups[key];
        
        // Weighted averages for costs
        const totalShares = existing.shares + h.shares;
        if (totalShares > 0) {
          existing.average_cost_instrument_ccy = 
            (existing.average_cost_instrument_ccy * existing.shares + h.average_cost_instrument_ccy * h.shares) / totalShares;
          
          existing.average_cost_portfolio_ccy = 
            (existing.average_cost_portfolio_ccy * existing.shares + h.average_cost_portfolio_ccy * h.shares) / totalShares;
        }

        // Sum shares
        existing.shares += h.shares;

        // Sum PnLs
        for (const pKey in h.period_pnl) {
          existing.period_pnl[pKey] = (existing.period_pnl[pKey] || 0) + (h.period_pnl[pKey] || 0);
        }
        for (const pKey in h.period_pnl_instrument_ccy) {
          existing.period_pnl_instrument_ccy[pKey] = (existing.period_pnl_instrument_ccy[pKey] || 0) + (h.period_pnl_instrument_ccy[pKey] || 0);
        }
      }
    }

    return Object.values(groups);
  }, [holdings]);

  const transactionsByTicker = useMemo(() => {
    return transactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
      if (!tx.ticker) return acc;
      const key = tx.ticker.toUpperCase();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(tx);
      return acc;
    }, {});
  }, [transactions]);

  const renderDetailPanel = useCallback(
    ({ row }: { row: MRT_Row<ApiHolding> }) => {
      const tickerKey = row.original.ticker?.toUpperCase?.() ?? "";
      const relatedTransactions = transactionsByTicker[tickerKey] ?? [];

      if (relatedTransactions.length === 0) {
        return (
          <div className="w-full p-4 bg-gray-50 border border-dashed border-gray-200 rounded-md text-sm text-gray-600">
            No transactions recorded for this holding yet.
          </div>
        );
      }

      return (
        <div className="w-full overflow-x-auto bg-gray-50 border border-gray-200 rounded-md p-4">
          <table className="w-full text-sm text-gray-700">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4 font-semibold">Type</th>
                <th className="py-2 pr-4 font-semibold">Shares</th>
                <th className="py-2 pr-4 font-semibold">Price</th>
                <th className="py-2 pr-4 font-semibold">Fee</th>
                <th className="py-2 pr-4 font-semibold">Timestamp</th>
                <th className="py-2 pr-4 font-semibold">Currency</th>
              </tr>
            </thead>
            <tbody>
              {relatedTransactions.map((tx) => (
                <tr key={tx.id} className="border-t border-gray-200 last:border-b-0">
                  <td className="py-2 pr-4 font-medium">{String(tx.transaction_type).toUpperCase()}</td>
                  <td className="py-2 pr-4">{Number(tx.shares).toLocaleString()}</td>
                  <td className="py-2 pr-4">
                    {Number(tx.price).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-2 pr-4">
                    {Number(tx.fee ?? 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-2 pr-4">
                    {tx.timestamp ? tx.timestamp.replace("T", " ").slice(0, 16) : "—"}
                  </td>
                  <td className="py-2 pr-4">{tx.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    },
    [transactionsByTicker]
  );

  if (isLoading && (!holdings || holdings.length === 0)) {
     return (
       <div className="space-y-4 p-4">
         {[1, 2, 3].map((i) => (
           <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
         ))}
       </div>
     );
  }

  if (!holdings || holdings.length === 0) {
    return <HoldingsEmptyState />;
  }

  return (
    <div className="shadow-sm">
      <MaterialReactTable
        columns={columns}
        data={groupedHoldings}
        enableRowActions
        enableExpanding
        positionActionsColumn="last"
        state={{ isLoading }}
        renderRowActions={({ row }) => (
          <div className="flex items-center gap-2">
            <Tooltip title="Remove holding">
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(row.original.ticker);
                }}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Set Alert">
                <IconButton size="small" onClick={(e) => {
                    e.stopPropagation();
                    setAlertModalTicker(row.original.ticker);
                }}>
                    <Bell className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                </IconButton>
            </Tooltip>
          </div>
        )}
        renderDetailPanel={renderDetailPanel}
        muiTableBodyRowProps={{
          sx: {
            // cursor: "pointer", // Removed pointer cursor since row is not clickable for nav
            backgroundColor: "#fff",
          },
          // onClick: () => navigate(`/stock-details/${row.original.ticker}`), // REMOVED
        }}
        muiTopToolbarProps={{
          sx: {
            backgroundColor: "#e5e7eb",
            paddingY: 1,
            paddingX: 2,
          },
        }}
        muiTableHeadCellProps={{
          sx: {
            backgroundColor: "#e5e7eb",
          },
        }}
        muiBottomToolbarProps={{
          sx: {
            backgroundColor: "#e5e7eb",
          },
        }}
      />
      {alertModalTicker && (
            <AddAlertModal
                isOpen={!!alertModalTicker}
                onClose={() => setAlertModalTicker(null)}
                defaultTicker={alertModalTicker}
                onSuccess={() => setAlertModalTicker(null)}
            />
      )}
    </div>
  );
}
