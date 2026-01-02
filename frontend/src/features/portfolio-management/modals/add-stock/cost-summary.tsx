import { FC } from "react";

interface CostSummaryProps {
  sumStock: number;
  sumAccount: number;
  currency: string;
  accountCurrency: string;
}

export const CostSummary: FC<CostSummaryProps> = ({
  sumStock,
  sumAccount,
  currency,
  accountCurrency,
}) => {
  return (
    <div className="col-span-4 min-h-[90px] flex flex-col justify-center">
      <div className="bg-blue-900/5 p-4 rounded-xl border border-blue-900/10">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-bold text-blue-900/60 uppercase tracking-widest">
            Total Cost (Instrument)
          </span>
          <span className="font-bold text-blue-900 text-lg">
            {sumStock.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            {currency || ""}
          </span>
        </div>

        {currency && accountCurrency && currency !== accountCurrency && (
          <div className="flex justify-between items-center border-t border-blue-900/5 pt-2">
            <span className="text-[10px] font-bold text-blue-900/60 uppercase tracking-widest">
              Est. Paid (Account)
            </span>
            <span className="font-bold text-blue-700">
              {sumAccount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {accountCurrency}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
