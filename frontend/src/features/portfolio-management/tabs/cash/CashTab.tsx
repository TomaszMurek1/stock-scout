"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useMrtLocalization } from "@/hooks/useMrtLocalization";
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table";
import { DollarSign, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Transaction } from "../../types";

interface Account {
  id: number;
  name: string;
  type: string;
  currency: string;
  cash: number;
}

interface CashTabProps {
  accounts?: Account[];
  transactions?: Transaction[];
}

export default function CashTab({ accounts = [], transactions = [] }: CashTabProps) {
  const { t } = useTranslation();
  const localization = useMrtLocalization();
  const totalCash = accounts.reduce((sum, acc) => sum + (acc.cash || 0), 0);
  const currency = accounts[0]?.currency || "USD";

  // Filter for Funding Transactions (Deposits/Withdrawals) which affect cash but aren't trade activity
  const fundingTransactions = useMemo(() => {
    return transactions.filter(t => 
        ['deposit', 'withdrawal'].includes(t.transaction_type?.toLowerCase())
    );
  }, [transactions]);

  const accountColumns = useMemo<MRT_ColumnDef<Account>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("portfolio.cash.account_name"),
        Cell: ({ row }) => (
          <div className="flex items-center gap-2 font-medium text-gray-900">
            <Wallet className="h-4 w-4 text-gray-500" />
            {row.original.name}
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: t("common.type"),
        Cell: ({ cell }) => <span className="capitalize">{cell.getValue<string>()}</span>,
      },
      {
        accessorKey: "currency",
        header: t("common.currency"),
      },
      {
        accessorKey: "cash",
        header: t("portfolio.cash.balance"),
        Cell: ({ row }) => (
          <span className="font-semibold text-gray-900">
             {row.original.cash.toLocaleString(undefined, {
                style: "currency",
                currency: row.original.currency,
             })}
          </span>
        ),
      },
    ],
    []
  );

  const fundingColumns = useMemo<MRT_ColumnDef<Transaction>[]>(
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
        },
        {
          accessorKey: "transaction_type",
          header: t("common.type"),
          Cell: ({ cell }) => {
              const type = cell.getValue<string>().toLowerCase();
              let icon = <ArrowDownCircle className="h-4 w-4" />;
              let colorClass = "bg-gray-100 text-gray-800";
  
              if (type === 'deposit') {
                  icon = <ArrowDownCircle className="h-4 w-4 text-green-600" />;
                   colorClass = "bg-green-50 text-green-700 border-green-100";
              } else if (type === 'withdrawal') {
                  icon = <ArrowUpCircle className="h-4 w-4 text-red-600" />;
                   colorClass = "bg-red-50 text-red-700 border-red-100";
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
        },
        {
          accessorKey: "amount", 
          header: t("portfolio.transactions.amount"),
          Cell: ({ row }) => {
               const val = Number(row.original.amount || 0);
               const currency = row.original.currency;
               
               const isPositive = ['deposit', 'dividend', 'interest'].includes(row.original.transaction_type.toLowerCase());
               
               return (
                   <span className={`font-medium ${isPositive ? "text-green-700" : "text-gray-900"}`}>
                      {isPositive ? "+" : ""}
                      {val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                       <span className="text-gray-500 text-xs ml-1">{currency}</span>
                   </span>
               )
          },
          Footer: ({ table }) => {
              const total = table.getFilteredRowModel().rows.reduce((sum, row) => {
                  return sum + Number(row.original.amount || 0);
              }, 0);
               const currency = table.getFilteredRowModel().rows[0]?.original.currency || "PLN"; // Fallback or take from row
              
              return (
                <div className="font-bold text-gray-900">
                  {t("portfolio.cash.total")}: {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                </div>
              );
          },
        },
      ],
      []
    );

  return (
    <div className="space-y-8">
      {/* 1. Summary Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
         <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <DollarSign size={20} />
            </div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{t("portfolio.cash.total_cash_available")}</h3>
         </div>
         <div className="text-3xl font-bold text-gray-900">
            {totalCash.toLocaleString(undefined, { style: "currency", currency })}
         </div>
      </div>

      {/* 2. Accounts Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
             <h3 className="text-sm font-semibold text-gray-700">{t("portfolio.cash.accounts_balances")}</h3>
        </div>
        <MaterialReactTable
            columns={accountColumns}
            data={accounts}
            localization={localization}
            enableTopToolbar={false}
            enableBottomToolbar={false}
            enableColumnActions={false}
            enableColumnFilters={false}
            enablePagination={false}
            enableSorting={true}
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
        />
      </div>
      
      {/* 3. Funding History Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
             <h3 className="text-sm font-semibold text-gray-700">{t("portfolio.cash.funding_history")}</h3>
        </div>
        {fundingTransactions.length > 0 ? (
            <MaterialReactTable
                columns={fundingColumns}
                data={fundingTransactions}
                localization={localization}
                enableTopToolbar={false} // clean look
                enableBottomToolbar={true}
                enableColumnActions={false}
                enableColumnFilters={false}
                enablePagination={true}
                enableSorting={true}
                initialState={{
                    sorting: [{ id: 'timestamp', desc: true }],
                    pagination: { pageSize: 5, pageIndex: 0 }
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
            />
        ) : (
            <div className="p-8 text-center text-gray-500 text-sm">
                {t("portfolio.cash.no_funding")}
            </div>
        )}
      </div>
    </div>
  );
}
