"use client";

import { MaterialReactTable } from "material-react-table";
import { Trash2 } from "lucide-react";
import { IconButton, Tooltip } from "@mui/material";
import type { ApiHolding } from "../../types";
import { useHoldingsColumns } from "./useHoldingsColumns";
import { HoldingsEmptyState } from "./HoldingsEmptyState";

interface HoldingsTabProps {
  holdings: ApiHolding[];
  onRemove: (id: string) => void;
}

export default function HoldingsTab({ holdings, onRemove }: HoldingsTabProps) {
  console.log("byHolding", holdings);

  if (holdings.length === 0) {
    return <HoldingsEmptyState />;
  }

  const columns = useHoldingsColumns();

  return (
    <div className="shadow-sm">
      <MaterialReactTable
        columns={columns}
        data={holdings}
        enableRowActions
        positionActionsColumn="last"
        renderRowActions={({ row }) => (
          <Tooltip title="Remove holding">
            <IconButton size="small" onClick={() => onRemove(row.original.ticker)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </IconButton>
          </Tooltip>
        )}
        muiTopToolbarProps={{
          sx: {
            backgroundColor: "#e5e7eb", // gray-200
            paddingY: 1,
            paddingX: 2,
          },
        }}
        muiTableHeadCellProps={{
          sx: {
            backgroundColor: "#e5e7eb",
          },
        }}
        muiTableBodyRowProps={{
          sx: {
            backgroundColor: "#fff",
          },
        }}
        muiBottomToolbarProps={{
          sx: {
            backgroundColor: "#e5e7eb",
          },
        }}
      />
    </div>
  );
}
