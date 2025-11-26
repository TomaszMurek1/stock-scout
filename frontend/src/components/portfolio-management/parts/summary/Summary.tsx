// src/components/Summary.tsx
import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { CurrencyCode, formatCurrency, formatPercent, currencyLocaleMap } from "./summary.helpers";

interface SummaryProps {
  invested_value_current: number;
  totalInvested: number;
  totalGainLoss: number;
  percentageChange: number;
  currency: CurrencyCode;
}

interface PriceProps {
  value: number;
  currency: CurrencyCode;
}
const Price: React.FC<PriceProps> = ({ value, currency }) => {
  const locale = currencyLocaleMap[currency];
  const formatted = (value ?? 0).toLocaleString(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return <div className="text-2xl font-bold text-gray-900">{formatted}</div>;
};

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
  const bgColor = "bg-gray-200";
  const padding = "p-6";
  const borderRadius = "rounded-lg";
  const boxShadow = "shadow-md";
  const border = "border border-gray-400";

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`${bgColor} ${padding} ${borderRadius} ${boxShadow} ${border}`}>
          <div className="text-sm text-gray-600 mb-1">Total Portfolio Value</div>
          <Price value={invested_value_current} currency={currency} />
        </div>

        <div className={`${bgColor} ${padding} ${borderRadius} ${boxShadow} ${border}`}>
          <div className="text-sm text-gray-600 mb-1">Total Invested</div>
          <Price value={totalInvested} currency={currency} />
        </div>

        <div className={`${bgColor} ${padding} ${borderRadius} ${boxShadow} ${border}`}>
          <div className="text-sm text-gray-600 mb-1">Total Gain/Loss</div>
          <GainLoss totalGainLoss={totalGainLoss} currency={currency} isPositive={isPositiveGL} />
        </div>

        <div className={`${bgColor} ${padding} ${borderRadius} ${boxShadow} ${border}`}>
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
