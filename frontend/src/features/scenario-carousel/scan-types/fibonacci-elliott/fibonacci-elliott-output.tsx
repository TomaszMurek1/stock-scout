import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table";
import { Button, Tooltip } from "@mui/material";
import { ArrowRight } from "lucide-react";
import { API_URL } from "@/services/apiClient";
import { useAppStore, AppState } from "@/store/appStore";
import { Card, CardContent } from "@/components/ui/card";

export interface FiboWaveResult {
  ticker: string;
  company_name: string;
  kelly_fraction: number;
  wave_count: number;
  pivot_count: number;
  last_wave?: string;
}

interface FiboWaveOutputProps {
  results: FiboWaveResult[];
}

export const FiboWaveOutput: React.FC<FiboWaveOutputProps> = ({ results }) => {
  const navigate = useNavigate();

  const handleViewDetails = (ticker: string) => {
    navigate(`/scenarios/fibonacci-elliott/${ticker}`);
  };

  const columns = useMemo<MRT_ColumnDef<FiboWaveResult>[]>(
    () => [
      {
        accessorKey: "company_name",
        header: "Company",
        size: 250,
        Cell: ({ row }) => (
            <Tooltip title={row.original.ticker} placement="top">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 flex-shrink-0 bg-gray-100 rounded-full border border-gray-200 flex items-center justify-center overflow-hidden">
                    <img
                        src={`${API_URL}/stock-details/${row.original.ticker}/logo`}
                        alt={row.original.ticker}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                            e.currentTarget.style.display = "none";
                            if (e.currentTarget.parentElement) {
                                e.currentTarget.parentElement.innerHTML = `<span class="text-xs font-bold text-gray-400">${row.original.ticker.substring(0, 2)}</span>`;
                            }
                        }}
                    />
                 </div>
                <span className="font-medium text-gray-900">{row.original.company_name}</span>
              </div>
            </Tooltip>
        ),
      },
      {
        accessorKey: "kelly_fraction",
        header: "Kelly %",
        size: 100,
        muiTableHeadCellProps: {
            align: 'right',
        },
        muiTableBodyCellProps: {
            align: 'right',
        },
        Cell: ({ cell }) => {
          const val = cell.getValue<number>();
          let colorClass = "text-gray-600";
          if (val >= 0.2) colorClass = "text-green-600 font-bold";
          else if (val >= 0.1) colorClass = "text-blue-600 font-medium";

          return (
            <span className={colorClass}>
              {(val * 100).toFixed(1)}%
            </span>
          );
        },
      },
      {
        accessorKey: "wave_count",
        header: "Waves",
        size: 80,
        enableHiding: true,
        muiTableHeadCellProps: {
            align: 'right',
        },
        muiTableBodyCellProps: {
            align: 'right',
        },
      },
      {
        accessorKey: "pivot_count",
        header: "Pivots",
        size: 80,
        enableHiding: true,
        muiTableHeadCellProps: {
            align: 'right',
        },
        muiTableBodyCellProps: {
            align: 'right',
        },
      },
      {
        accessorKey: "last_wave",
        header: "Last Wave",
        size: 100,
        enableHiding: true,
        Cell: ({ cell }) => (
            <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs font-semibold text-gray-700">
                {cell.getValue<string>() || "—"}
            </span>
        ),
      },
    ],
    []
  );

  return (
    <Card className="bg-zinc-50 shadow-lg overflow-hidden mb-4">
      <CardContent className="p-0">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Scan Results</h3>
          <p className="text-sm text-gray-500">Found {results.length} stocks matching your criteria</p>
        </div>
      <MaterialReactTable
        columns={columns}
        data={results}
        enableRowActions
        positionActionsColumn="last"
        layoutMode="grid"
        enableColumnResizing
        enableDensityToggle
        initialState={{
            sorting: [{ id: 'kelly_fraction', desc: true }],
            density: 'compact',
        }}
        displayColumnDefOptions={{
            'mrt-row-actions': {
              header: 'Action',
              size: 100,
              muiTableHeadCellProps: {
                align: 'right',
              },
            },
          }}
        renderRowActions={({ row }) => (
          <Button
            variant="outlined"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails(row.original.ticker);
            }}
            endIcon={<ArrowRight size={16} />}
            sx={{ textTransform: "none", fontSize: "0.8rem", fontWeight: 600 }}
          >
            View
          </Button>
        )}
        muiTableContainerProps={{
          sx: {
            maxWidth: '100%',
          },
        }}
        muiTablePaperProps={{
          sx: {
            boxShadow: 'none',
          },
        }}
        muiTableHeadCellProps={{
          sx: {
            backgroundColor: "#f9fafb",
            fontWeight: "bold",
            color: "#374151",
          },
        }}
        muiTableBodyRowProps={({ row }) => ({
            sx: {
                cursor: "pointer",
                '&:hover': {
                    backgroundColor: '#f3f4f6 !important'
                }
            },
            onClick: () => handleViewDetails(row.original.ticker),
        })}
      />
      <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <p>
            <strong>Kelly Fraction Tip:</strong> Scores &gt; 20% indicate a strong historical edge. Darker green indicates higher quality setups.
        </p>
      </div>
      </CardContent>
    </Card>
  );
};
