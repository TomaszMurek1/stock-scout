import React from "react";
import { DollarSign } from "lucide-react";
import { Card, DataRow } from "./SummaryShared";
import { Period } from "../../../../types";

interface DetailedBreakdownProps {
  breakdown: any;
  itd: any;
  selectedPeriod: Period;
  currency: any;
}

export const DetailedBreakdown = ({ breakdown, itd, selectedPeriod, currency }: DetailedBreakdownProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
       {/* Selected Period Analysis */}
       <Card className="border-l-4 border-blue-500 pl-5">
          <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
             {selectedPeriod.toUpperCase()} Analysis (Invested)
          </h4>
          {breakdown.invested ? (
              <div className="space-y-1">
                 <DataRow label="Beginning Invested" value={breakdown.invested.beginning_value} currency={currency} className="opacity-75" />
                 <DataRow label="Net Deposits" value={breakdown.cash_flows?.net_external || 0} currency={currency} valueClassName="text-blue-600" />
                 <DataRow label="Net Purchases" value={breakdown.invested.net_trades} currency={currency} />
                 <DataRow 
                     label="Capital Gains" 
                     value={breakdown.invested.capital_gains} 
                     currency={currency} 
                     isBold 
                     valueClassName={breakdown.invested.capital_gains >= 0 ? "text-emerald-600" : "text-red-600"}
                 />
                 <div className="pt-2 mt-2 border-t border-gray-100">
                     <DataRow label="Ending Invested" value={breakdown.invested.ending_value} currency={currency} isBold valueClassName="text-lg" />
                 </div>
                  <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                        <DollarSign className="w-3 h-3"/> Cash Impact
                    </h5>
                    <DataRow label="Dividends & Interest" value={breakdown.income_expenses.dividends + breakdown.income_expenses.interest} currency={currency} valueClassName="text-emerald-600" />
                    <DataRow label="Fees & Taxes" value={(breakdown.income_expenses.fees + breakdown.income_expenses.taxes) * -1} currency={currency} valueClassName="text-red-500" />
                  </div>
              </div>
          ) : (
               <div className="space-y-1">
                 <DataRow label="Beginning Value" value={breakdown.beginning_value} currency={currency} />
                 <DataRow label="Net Deposits" value={breakdown.cash_flows?.net_external || 0} currency={currency} valueClassName="text-blue-600" />
                 <DataRow label="Income (Divs/Interest)" value={(breakdown.income_expenses?.dividends || 0) + (breakdown.income_expenses?.interest || 0)} currency={currency} />
                 <DataRow label="Fees & Taxes" value={((breakdown.income_expenses?.fees || 0) + (breakdown.income_expenses?.taxes || 0)) * -1} currency={currency} />
                 <DataRow label="Capital Gains" value={breakdown.pnl?.total_pnl_ex_flows || 0} currency={currency} isBold />
                 <div className="pt-2 mt-2 border-t border-gray-100">
                     <DataRow label="Ending Value" value={breakdown.ending_value} currency={currency} isBold />
                 </div>
              </div>
           )}
       </Card>

        {/* ITD Analysis (Always shown as reference) */}
        <Card className="border-l-4 border-indigo-500 pl-5">
          <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
             Inception Analysis (Invested)
          </h4>
           {itd.invested ? (
              <div className="space-y-1">
                 <DataRow label="Beginning Invested" value={0} currency={currency} className="opacity-75" />
                 <DataRow label="Total Net Deposits" value={itd.cash_flows?.net_external || 0} currency={currency} valueClassName="text-blue-600" />
                 <DataRow label="Total Net Invested" value={itd.invested.net_trades} currency={currency} />
                 <DataRow 
                     label="Total Capital Gains" 
                     value={itd.invested.capital_gains} 
                     currency={currency} 
                     isBold 
                     valueClassName={itd.invested.capital_gains >= 0 ? "text-emerald-600" : "text-red-600"}
                 />
                 <div className="pt-2 mt-2 border-t border-gray-100">
                     <DataRow label="Current Invested" value={itd.invested.ending_value} currency={currency} isBold valueClassName="text-lg" />
                 </div>
                  <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                        <DollarSign className="w-3 h-3"/> Total Income
                    </h5>
                    <DataRow label="Dividends & Interest" value={itd.income_expenses.dividends + itd.income_expenses.interest} currency={currency} valueClassName="text-emerald-600" />
                    <DataRow label="Fees & Taxes" value={(itd.income_expenses.fees + itd.income_expenses.taxes) * -1} currency={currency} valueClassName="text-red-500" />
                  </div>
              </div>
           ) : (
              <div className="space-y-1">
                 <DataRow label="Total Invested Cash" value={itd.cash_flows?.net_external || 0} currency={currency} />
                 <DataRow label="Total Dividends Received" value={itd.income_expenses?.dividends || 0} currency={currency} />
                 <DataRow label="Total Fees Paid" value={itd.income_expenses?.fees || 0} currency={currency} />
                 <DataRow label="Realized Gains" value={itd.pnl?.realized_gains_approx || 0} currency={currency} />
                 <DataRow label="Unrealized Gains" value={itd.pnl?.unrealized_gains_residual || 0} currency={currency} isBold />
                  <div className="pt-2 mt-2 border-t border-gray-100">
                     <DataRow label="Current Value" value={itd.ending_value} currency={currency} isBold />
                 </div>
              </div>
           )}
       </Card>
     </div>
  );
};
