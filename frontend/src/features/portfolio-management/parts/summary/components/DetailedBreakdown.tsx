import React from "react";
import { DollarSign } from "lucide-react";
import { Card, DataRow } from "./SummaryShared";
import { Period } from "../../../types";
import { useTranslation } from "react-i18next";

interface DetailedBreakdownProps {
  breakdown: any;
  itd: any;
  selectedPeriod: Period;
  currency: any;
}

export const DetailedBreakdown = ({ breakdown, itd, selectedPeriod, currency }: DetailedBreakdownProps) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
       {/* Selected Period Analysis */}
       <Card className="border-l-4 border-blue-500 pl-5">
          <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
             {selectedPeriod.toUpperCase()} {t("portfolio.summary.analysis_invested")}
          </h4>
          {breakdown.invested ? (
              <div className="space-y-1">
                 <DataRow label={t("portfolio.summary.beginning_invested")} value={breakdown.invested.beginning_value} currency={currency} className="opacity-75" />
                 <DataRow label={t("portfolio.summary.net_deposits")} value={breakdown.cash_flows?.net_external || 0} currency={currency} valueClassName="text-blue-600" />
                 <DataRow label={t("portfolio.summary.net_purchases")} value={breakdown.invested.net_trades} currency={currency} />
                 <DataRow 
                     label={t("portfolio.summary.capital_gains")}
                     value={breakdown.invested.capital_gains} 
                     currency={currency} 
                     isBold 
                     valueClassName={breakdown.invested.capital_gains >= 0 ? "text-emerald-600" : "text-red-600"}
                 />
                 <div className="pt-2 mt-2 border-t border-gray-100">
                     <DataRow label={t("portfolio.summary.ending_invested")} value={breakdown.invested.ending_value} currency={currency} isBold valueClassName="text-lg" />
                 </div>
                  <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                        <DollarSign className="w-3 h-3"/> {t("portfolio.summary.cash_impact")}
                    </h5>
                    <DataRow label={t("portfolio.summary.dividends_interest")} value={breakdown.income_expenses.dividends + breakdown.income_expenses.interest} currency={currency} valueClassName="text-emerald-600" />
                    <DataRow label={t("portfolio.summary.fees_taxes")} value={(breakdown.income_expenses.fees + breakdown.income_expenses.taxes) * -1} currency={currency} valueClassName="text-red-500" />
                  </div>
              </div>
          ) : (
               <div className="space-y-1">
                 <DataRow label={t("portfolio.summary.beginning_value")} value={breakdown.beginning_value} currency={currency} />
                 <DataRow label={t("portfolio.summary.net_deposits")} value={breakdown.cash_flows?.net_external || 0} currency={currency} valueClassName="text-blue-600" />
                 <DataRow label={t("portfolio.summary.income_divs_interest")} value={(breakdown.income_expenses?.dividends || 0) + (breakdown.income_expenses?.interest || 0)} currency={currency} />
                 <DataRow label={t("portfolio.summary.fees_taxes")} value={((breakdown.income_expenses?.fees || 0) + (breakdown.income_expenses?.taxes || 0)) * -1} currency={currency} />
                 <DataRow label={t("portfolio.summary.capital_gains")} value={breakdown.pnl?.total_pnl_ex_flows || 0} currency={currency} isBold />
                 <div className="pt-2 mt-2 border-t border-gray-100">
                     <DataRow label={t("portfolio.summary.ending_value")} value={breakdown.ending_value} currency={currency} isBold />
                 </div>
              </div>
           )}
       </Card>

        {/* ITD Analysis (Always shown as reference) */}
        <Card className="border-l-4 border-indigo-500 pl-5">
          <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
             {t("portfolio.summary.inception_analysis")}
          </h4>
           {itd.invested ? (
              <div className="space-y-1">
                 <DataRow label={t("portfolio.summary.beginning_invested")} value={0} currency={currency} className="opacity-75" />
                 <DataRow label={t("portfolio.summary.total_net_deposits")} value={itd.cash_flows?.net_external || 0} currency={currency} valueClassName="text-blue-600" />
                 <DataRow label={t("portfolio.summary.total_net_invested")} value={itd.invested.net_trades} currency={currency} />
                 <DataRow 
                     label={t("portfolio.summary.total_pnl_itd")} 
                     value={itd.invested.capital_gains} 
                     currency={currency} 
                     isBold 
                     valueClassName={itd.invested.capital_gains >= 0 ? "text-emerald-600" : "text-red-600"}
                 />
                 <div className="pt-2 mt-2 border-t border-gray-100">
                     <DataRow label={t("portfolio.summary.current_invested")} value={itd.invested.ending_value} currency={currency} isBold valueClassName="text-lg" />
                 </div>
                  <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                        <DollarSign className="w-3 h-3"/> {t("portfolio.summary.total_income")}
                    </h5>
                    <DataRow label={t("portfolio.summary.dividends_interest")} value={itd.income_expenses.dividends + itd.income_expenses.interest} currency={currency} valueClassName="text-emerald-600" />
                    <DataRow label={t("portfolio.summary.fees_taxes")} value={(itd.income_expenses.fees + itd.income_expenses.taxes) * -1} currency={currency} valueClassName="text-red-500" />
                  </div>
              </div>
           ) : (
              <div className="space-y-1">
                 <DataRow label={t("portfolio.summary.total_invested_cash")} value={itd.cash_flows?.net_external || 0} currency={currency} />
                 <DataRow label={t("portfolio.summary.total_dividends_received")} value={itd.income_expenses?.dividends || 0} currency={currency} />
                 <DataRow label={t("portfolio.summary.total_fees_paid")} value={itd.income_expenses?.fees || 0} currency={currency} />
                 <DataRow label={t("portfolio.summary.realized_gains")} value={itd.pnl?.realized_gains_approx || 0} currency={currency} />
                 <DataRow label={t("portfolio.summary.unrealized_gains")} value={itd.pnl?.unrealized_gains_residual || 0} currency={currency} isBold />
                  <div className="pt-2 mt-2 border-t border-gray-100">
                     <DataRow label={t("portfolio.summary.current_value")} value={itd.ending_value} currency={currency} isBold />
                 </div>
              </div>
           )}
       </Card>
     </div>
  );
};
