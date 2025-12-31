import { FC, useState, useMemo } from "react";
import { Card, Badge } from "@/components/ui/Layout";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { StockData } from "./stock-one-pager.types";
import { formatCurrency } from "@/utils/formatting";
import { format, parseISO } from "date-fns";
import { Nullable } from "@/components/types/shared.types";

interface FinancialTrendsCardProps {
  financialTrends: StockData["financial_trends"];
  currency: Nullable<string>;
}

type MetricKey = "revenue" | "net_income" | "ebitda" | "free_cash_flow" | "gross_profit" | "operating_income";

const METRIC_LABELS: Record<MetricKey, string> = {
  revenue: "Revenue",
  net_income: "Net Income",
  ebitda: "EBITDA",
  free_cash_flow: "Free Cash Flow",
  gross_profit: "Gross Profit",
  operating_income: "Operating Income",
};

const FinancialTrendsCard: FC<FinancialTrendsCardProps> = ({
  financialTrends,
  currency,
}) => {
  const [period, setPeriod] = useState<"annual" | "quarterly">("quarterly");
  const [activeTab, setActiveTab] = useState<MetricKey>("revenue");

  // Prepare data for the selected period and metric
  const tableData = useMemo(() => {
    const source = financialTrends[period];
    if (!source) return [];
    
    const data = (source[activeTab] || [])
        .filter(item => item.value != null)
        // Sort descending for table (newest first)
        .sort((a, b) => {
             if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
             return b.year - a.year;
        });

    // Calculate Change
    return data.map((item, index, arr) => {
      const prevItem = arr[index + 1]; // Next item in descending array is previous period
      const change = prevItem?.value
        ? ((item.value - prevItem.value) / Math.abs(prevItem.value)) * 100
        : null;
      
      return {
        date: item.date,
        year: item.year,
        value: item.value,
        change,
      };
    });
  }, [financialTrends, period, activeTab]);

  // Prepare chart data (ascending)
  const chartData = useMemo(() => {
      return [...tableData].reverse();
  }, [tableData]);

  const columns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "date", // For sorting/grouping
        header: period === "quarterly" ? "Date" : "Year",
        size: 100,
        Cell: ({ row }) => (
            <span className="font-medium text-slate-700">
                {period === "quarterly" && row.original.date 
                    ? format(parseISO(row.original.date), "MMM d, yyyy") 
                    : row.original.year}
            </span>
        ),
      },
      {
        accessorKey: "value",
        header: `${METRIC_LABELS[activeTab]} (${currency || "USD"})`,
        Cell: ({ cell }) => (
          <span className="font-mono text-slate-900">
            {formatCurrency({ 
                value: cell.getValue<number>(), 
                currency: currency || "USD",
                notation: "compact",
                maximumFractionDigits: 2
            })}
          </span>
        ),
      },
      {
        accessorKey: "change",
        header: period === "quarterly" ? "QoQ Change" : "YoY Change",
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          if (val == null) return <span className="text-slate-400">-</span>;
          const isPositive = val >= 0;
          return (
            <Badge
                variant={isPositive ? "success" : "danger"}
                className="w-20 justify-center"
            >
                {isPositive ? "+" : ""}
                {val.toFixed(2)}%
            </Badge>
          );
        },
      },
    ],
    [currency, period, activeTab]
  );

  return (
    <Card className="overflow-hidden bg-white shadow-sm border border-slate-200">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/30">
        <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
            <line x1="12" y1="20" x2="12" y2="10"></line>
            <line x1="18" y1="20" x2="18" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="16"></line>
          </svg>
          Financial Trends
        </h3>
        
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button
                onClick={() => setPeriod("quarterly")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    period === "quarterly" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
            >
                Quarterly
            </button>
            <button
                onClick={() => setPeriod("annual")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    period === "annual" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
            >
                Annual
            </button>
        </div>
      </div>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MetricKey)} className="mb-6">
          <TabsList className="grid grid-cols-3 lg:grid-cols-6 h-auto bg-slate-100/50 p-1">
            {Object.entries(METRIC_LABELS).map(([key, label]) => (
              <TabsTrigger 
                key={key} 
                value={key}
                className="text-xs py-2 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart Section */}
            <div className="lg:col-span-3 h-[250px] w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey={period === "quarterly" ? "date" : "year"} 
                            tickFormatter={(val) => {
                                if (period === "quarterly" && val) {
                                    try { return format(parseISO(val), "MMM yy"); } catch { return val; }
                                }
                                return val;
                            }}
                            fontSize={11}
                            stroke="#94a3b8"
                            tickMargin={10}
                        />
                        <YAxis 
                            fontSize={11}
                            stroke="#94a3b8"
                            tickFormatter={(val) => formatCurrency({ value: val, notation: "compact", currency })}
                        />
                        <Tooltip 
                            formatter={(value: number) => [formatCurrency({ value, currency }), METRIC_LABELS[activeTab]]}
                            labelFormatter={(label) => period === "quarterly" ? format(parseISO(String(label)), "MMM d, yyyy") : label}
                            contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorValue)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Table Section */}
            <div className="lg:col-span-3">
                <MaterialReactTable
                    columns={columns}
                    data={tableData}
                    enableTopToolbar={false}
                    enableBottomToolbar={false}
                    enableColumnActions={false}
                    enableColumnFilters={false}
                    enablePagination={false}
                    enableSorting={false}
                    muiTableBodyRowProps={{ hover: false }}
                    muiTablePaperProps={{ elevation: 0, sx: { border: '1px solid #e2e8f0', borderRadius: '8px' } }}
                    muiTableHeadCellProps={{
                        sx: {
                            backgroundColor: '#f8fafc',
                            color: '#64748b',
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontWeight: 600,
                        }
                    }}
                    muiTableBodyCellProps={{
                        sx: {
                            fontSize: '0.875rem',
                            padding: '12px 16px',
                        }
                    }}
                    initialState={{ density: 'compact' }}
                />
            </div>
        </div>
      </div>
    </Card>
  );
};

export default FinancialTrendsCard;
