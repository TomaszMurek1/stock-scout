"use client";

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table";
import { ArrowDownCircle, ArrowUpCircle, DollarSign, Percent, FileText } from "lucide-react";
import { Transaction } from "../../types";
import { useTranslation } from "react-i18next";
import { API_URL } from "@/services/apiClient";
import { useMrtLocalization } from "@/hooks/useMrtLocalization";

interface TransactionsHistoryProps {
  transactions?: Transaction[];
  portfolioCurrency?: string;
}

export default function TransactionsHistory({ transactions = [], portfolioCurrency = "PLN" }: TransactionsHistoryProps) {
  const { t } = useTranslation();
  const localization = useMrtLocalization();
  
  // Filter out Deposit/Withdrawal - these go to Cash Tab
  const portfolioActivity = useMemo(() => {
    return transactions.filter(t => 
        !['deposit', 'withdrawal'].includes(t.transaction_type?.toLowerCase())
    );
  }, [transactions]);

  const columns = useMemo<MRT_ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: "timestamp",
        header: t("portfolio.transactions.date"),
        Cell: ({ cell }) => {
            const date = new Date(cell.getValue<string>());
            return (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{date.toLocaleDateString()}</span>
                    <span className="text-xs text-gray-500">{date.toLocaleTimeString()}</span>
                </div>
            )
        },
        sortingFn: "datetime",
        size: 120, // fixed width for date
      },
      {
        accessorFn: (row) => t(`portfolio.transactions.types.${row.transaction_type.toLowerCase()}`, { defaultValue: row.transaction_type }),
        id: "transaction_type",
        header: t("portfolio.transactions.type"),
        Cell: ({ cell, row }) => {
            const type = row.original.transaction_type.toLowerCase();
            let icon = <ArrowDownCircle className="h-4 w-4" />;
            let colorClass = "bg-gray-100 text-gray-800 border-gray-200";

            if (type === 'buy') {
                icon = <ArrowDownCircle className="h-4 w-4 text-emerald-600" />;
                colorClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
            } else if (type === 'sell') {
                icon = <ArrowUpCircle className="h-4 w-4 text-amber-600" />;
                 colorClass = "bg-amber-50 text-amber-700 border-amber-100";
            } else if (type === 'dividend') {
                icon = <DollarSign className="h-4 w-4 text-blue-600" />;
                 colorClass = "bg-blue-50 text-blue-700 border-blue-100";
            } else if (type === 'tax') {
                icon = <FileText className="h-4 w-4 text-red-600" />;
                 colorClass = "bg-red-50 text-red-700 border-red-100";
            } else if (type === 'fee') {
                icon = <DollarSign className="h-4 w-4 text-orange-600" />;
                 colorClass = "bg-orange-50 text-orange-700 border-orange-100";
            } else if (type === 'interest') {
                icon = <Percent className="h-4 w-4 text-indigo-600" />;
                 colorClass = "bg-indigo-50 text-indigo-700 border-indigo-100";
            }

            return (
                <div className="flex items-center gap-2">
                    {icon}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass} capitalize`}>
                        {t(`portfolio.transactions.types.${type}`, { defaultValue: type })}
                    </span>
                </div>
            );
        },
        filterVariant: 'multi-select',
        filterSelectOptions: [
            t("portfolio.transactions.types.buy"), 
            t("portfolio.transactions.types.sell"), 
            t("portfolio.transactions.types.dividend"), 
            t("portfolio.transactions.types.tax"), 
            t("portfolio.transactions.types.fee"), 
            t("portfolio.transactions.types.interest")
        ],
        size: 140,
      },
      {
        accessorKey: "name", // Use name for sorting/filtering
        header: t("portfolio.transactions.company"),
        Cell: ({ row }) => {
             const ticker = row.original.ticker;
             
             // If no ticker, just show name (e.g. for general fees if any)
             if (!ticker) return <span className="text-gray-900 font-medium">{row.original.name || "-"}</span>;

             return (
                <Link to={`/stock-details/${ticker}`} className="flex items-center gap-3 w-full group no-underline" onClick={(e) => e.stopPropagation()}>
                    <img
                    src={`${API_URL}/stock-details/${ticker}/logo`}
                    alt={ticker}
                    className="w-8 h-8 object-contain bg-gray-200 border border-gray-100 rounded-md p-0.5"
                    onError={(e) => {
                        e.currentTarget.style.display = "none";
                    }}
                    />
                    <div className="flex flex-col">
                    <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{row.original.name}</span>
                    <span className="text-xs text-gray-500 font-medium">{ticker}</span>
                    </div>
                </Link>
             )
        },
        size: 250,
      },
      {
        accessorKey: "shares",
        header: t("portfolio.transactions.shares"),
         Cell: ({ row }) => {
            const type = row.original.transaction_type.toLowerCase();
            if (['dividend', 'tax', 'fee', 'interest'].includes(type)) return <span className="text-gray-300">-</span>;

            const val = Number(row.original.shares);
            if (!val) return <span className="text-gray-300">-</span>;
             return <span className="font-medium text-gray-700">{val.toLocaleString()}</span>;
         },
         size: 100,
      },
      {
        accessorKey: "price",
        header: t("portfolio.transactions.price"),
        Cell: ({ row }) => {
             const type = row.original.transaction_type.toLowerCase();
             if (['dividend', 'tax', 'fee', 'interest'].includes(type)) return <span className="text-gray-300">-</span>;

             const val = Number(row.original.price);
             const currency = row.original.currency;
             
             // Price might be 0 for some types or if missing
             if (!val) return <span className="text-gray-300">-</span>;

             return (
                 <span className="font-medium text-gray-900">
                    {val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                     <span className="text-gray-400 text-xs ml-1">{currency}</span>
                 </span>
             )
        },
        size: 120,
      },
      {
        id: "amount",
        header: t("portfolio.transactions.amount"),
        accessorFn: (row) => row.amount || 0,
        Cell: ({ row }) => {
            const originalAmount = Number(row.original.amount || 0);
            const type = row.original.transaction_type.toLowerCase();
            const txCurrency = row.original.currency;
            const fxRate = Number(row.original.currency_rate || 1);
            
            // Color coding for amount
            const isNegative = ['buy', 'fee', 'tax'].includes(type);
            const isPositive = ['sell', 'dividend', 'interest'].includes(type);
            
            let amountClass = "text-gray-900";
            if (isNegative) amountClass = "text-gray-900"; 
            if (type === 'dividend' || type === 'interest') amountClass = "text-green-600 font-semibold";
            
            // Calculate in portfolio currency
            const amountInPortfolioCcy = originalAmount * fxRate;
            const isDifferentCurrency = txCurrency !== portfolioCurrency;

            return (
                 <div className="flex flex-col items-start">
                     {/* Primary: Portfolio Currency */}
                     <span className={`font-medium ${amountClass}`}>
                        {amountInPortfolioCcy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         <span className="text-gray-500 text-xs ml-1">{portfolioCurrency}</span>
                     </span>
                     
                     {/* Secondary: Original Currency (if different) */}
                     {isDifferentCurrency && (
                         <span className="text-xs text-gray-400">
                            {originalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {txCurrency}
                         </span>
                     )}
                 </div>
             )
        },
        size: 140,
      },
    ],
    [portfolioCurrency, t]
  );

  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <MaterialReactTable
            columns={columns}
            data={portfolioActivity}
            localization={localization}
            enableTopToolbar={true}
            enableBottomToolbar={true}
            enableColumnActions={false}
            enableColumnFilters={true}
            enablePagination={true}
            enableSorting={true}
            initialState={{
                sorting: [{ id: 'timestamp', desc: true }],
                pagination: { pageSize: 15, pageIndex: 0 },
                columnFilters: [{ id: 'transaction_type', value: [
                    t("portfolio.transactions.types.buy"), 
                    t("portfolio.transactions.types.sell"), 
                    t("portfolio.transactions.types.dividend")
                ] }],
                density: 'compact',
            }}
            muiTablePaperProps={{
                elevation: 0,
                sx: { borderRadius: "0" }
            }}
            muiTableHeadCellProps={{
                sx: {
                    backgroundColor: "#f9fafb",
                    fontWeight: "600",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    fontSize: "0.75rem",
                    letterSpacing: "0.05em"
                }
            }}
            muiTableBodyRowProps={{
                sx: {
                    '&:hover': {
                        backgroundColor: '#f9fafb',
                    }
                }
            }}
            muiTableBodyCellProps={{
                sx: {
                    paddingTop: "0.75rem",
                    paddingBottom: "0.75rem"
                }
            }}
        />
    </div>
  );
}
