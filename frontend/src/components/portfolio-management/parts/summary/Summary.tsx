// src/components/Summary.tsx
import React, { useMemo } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { CurrencyRate } from "../../types";

interface SummaryProps {
  totalValue: number;
  invested_value_current: number;
  totalInvested: number;
  totalGainLoss: number;
  percentageChange: number;
  currency: CurrencyCode;
}

export type CurrencyCode = "USD" | "EUR" | "GBP" | "PLN";

const currencyLocaleMap: Record<CurrencyCode, string> = {
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  PLN: "pl-PL",
};

interface PriceProps {
  value: number;
  currency: CurrencyCode;
}
export const Price: React.FC<PriceProps> = ({ value, currency }) => {
  const locale = currencyLocaleMap[currency];
  const formatted = (value ?? 0).toLocaleString(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return <div className="text-2xl font-bold text-gray-900">{formatted}</div>;
};

export const formatCurrency = (
  value: number,
  currency: CurrencyCode,
  locale = currencyLocaleMap[currency]
): string =>
  Math.abs(value).toLocaleString(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const formatPercent = (value: number, decimals = 2): string =>
  `${Math.abs(value).toFixed(decimals)}%`;

interface GainLossProps {
  totalGainLoss: number;
  currency: CurrencyCode;
  isPositive: boolean;
}
const GainLoss: React.FC<GainLossProps> = ({ totalGainLoss, currency, isPositive }) => {
  const cls = `text-2xl font-bold flex items-center justify-center ${
    isPositive ? "text-green-600" : "text-red-600"
  }`;
  return (
    <div className={cls}>
      {isPositive ? (
        <ArrowUpRight className="mr-1 h-5 w-5" />
      ) : (
        <ArrowDownRight className="mr-1 h-5 w-5" />
      )}
      {formatCurrency(totalGainLoss, currency)}
    </div>
  );
};

interface PercentageChangeProps {
  percentageChange: number;
  isPositive: boolean;
}
const PercentageChange: React.FC<PercentageChangeProps> = ({ percentageChange, isPositive }) => {
  const cls = `text-2xl font-bold flex items-center justify-center ${
    isPositive ? "text-green-600" : "text-red-600"
  }`;
  return (
    <div className={cls}>
      {isPositive ? (
        <ArrowUpRight className="mr-1 h-5 w-5" />
      ) : (
        <ArrowDownRight className="mr-1 h-5 w-5" />
      )}
      {formatPercent(percentageChange)}
    </div>
  );
};

export const Summary: React.FC<SummaryProps> = ({
  invested_value_current,
  totalInvested,
  totalGainLoss,
  percentageChange,
  currency,
}) => {
  const isPositiveGL = totalGainLoss >= 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total Portfolio Value</div>
          <Price value={invested_value_current} currency={currency} />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total Invested</div>
          <Price value={totalInvested} currency={currency} />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total Gain/Loss</div>
          <GainLoss totalGainLoss={totalGainLoss} currency={currency} isPositive={isPositiveGL} />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Percentage Change</div>
          <PercentageChange
            percentageChange={percentageChange}
            isPositive={percentageChange >= 0}
          />
        </div>
      </div>
    </div>
  );
};

export default Summary;
