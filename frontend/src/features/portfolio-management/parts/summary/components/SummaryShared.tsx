import React from "react";
import { ArrowUpRight, ArrowDownRight, HelpCircle } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CurrencyCode, Period } from "@/features/portfolio-management/types";
import { currencyLocaleMap, formatCurrency, formatPercent } from "../summary.helpers";

export const PERIODS: Period[] = ["1d", "1w", "1m", "3m", "6m", "1y", "ytd", "itd"];

export const PeriodSelector = ({ selected, onSelect }: { selected: Period; onSelect: (p: Period) => void }) => (
  <div className="flex bg-gray-100 p-1 rounded-lg">
    {PERIODS.map((p) => (
      <button
        key={p}
        onClick={() => onSelect(p)}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          selected === p
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
        }`}
      >
        {p.toUpperCase()}
      </button>
    ))}
  </div>
);

export const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 ${className}`}>
    {children}
  </div>
);

export const Label = ({ children, tooltip }: { children: React.ReactNode; tooltip?: string }) => (
  <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium mb-1">
    {children}
    {tooltip && (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger>
            <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-slate-900 text-white p-3 rounded-lg text-xs leading-relaxed whitespace-pre-line">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}
  </div>
);

export const Value = ({
  value,
  currency,
  className = "",
}: {
  value: number;
  currency?: CurrencyCode;
  className?: string;
}) => {
  const formatted = currency
    ? value.toLocaleString(currencyLocaleMap[currency], {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <div className={`text-2xl font-bold text-gray-900 ${className}`}>{formatted}</div>;
};

export const PercentValue = ({ value }: { value: number }) => {
  const isPositive = value >= 0;
  const color = isPositive ? "text-green-600" : "text-red-600";
  return (
    <div className={`flex items-center text-lg font-bold ${color}`}>
      {isPositive ? <ArrowUpRight className="w-5 h-5 mr-1" /> : <ArrowDownRight className="w-5 h-5 mr-1" />}
      {formatPercent(value * 100)}
    </div>
  );
};

export const DataRow = ({
  label,
  value,
  currency,
  isBold = false,
  className = "",
  valueClassName = "",
}: {
  label: string;
  value: number;
  currency?: CurrencyCode;
  isBold?: boolean;
  className?: string;
  valueClassName?: string;
}) => (
  <div className={`flex justify-between items-center py-2 border-b border-gray-50 last:border-0 ${className}`}>
    <span className={`text-sm ${isBold ? "text-gray-800 font-medium" : "text-gray-500"}`}>{label}</span>
    <span className={`${isBold ? "font-bold text-gray-900" : "text-gray-700 font-medium"} ${valueClassName}`}>
      {currency
        ? formatCurrency(value, currency)
        : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  </div>
);
