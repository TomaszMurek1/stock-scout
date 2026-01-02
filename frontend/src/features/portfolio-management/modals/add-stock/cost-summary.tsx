import { FC } from "react";
import { AlertCircle } from "lucide-react";

interface CostSummaryProps {
  sumStock: number;
  sumAccount: number;
  currency: string;
  accountCurrency: string;
  fee: number;
  hasInsufficientBalance: boolean;
  availableBalance: number;
}

export const CostSummary: FC<CostSummaryProps> = ({
  sumStock,
  sumAccount,
  currency,
  accountCurrency,
  fee,
  hasInsufficientBalance,
  availableBalance,
}) => {
  const areCurrenciesDifferent = currency && accountCurrency && currency !== accountCurrency;

  return (
    <div className="col-span-4 min-h-[90px] flex flex-col justify-center">
      <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-blue-900/60 uppercase tracking-widest">
            Total Cost (Instrument)
          </span>
          <span className="text-blue-900 font-medium text-xs">
            {sumStock.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            {currency || ""}
          </span>
        </div>

        {fee > 0 && (
          <div className="flex justify-between items-center mt-1">
            <span className="text-blue-900/50 text-xs">Fee</span>
            <span className="text-blue-900/70 font-medium text-xs">
              +{fee.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {accountCurrency}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 mt-2 border-t border-blue-900/10">
          <span className="text-[10px] font-bold text-blue-900/60 uppercase tracking-widest">
            Total Paid{areCurrenciesDifferent ? " (Account)" : ""}
          </span>
          <span className="font-bold text-blue-700">
            {sumAccount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            {accountCurrency}
          </span>
        </div>
      </div>

      {hasInsufficientBalance && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-red-800">Insufficient Balance</p>
            <p className="text-xs text-red-700 mt-0.5">
              Available: {availableBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {accountCurrency} | Required: {sumAccount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {accountCurrency}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
