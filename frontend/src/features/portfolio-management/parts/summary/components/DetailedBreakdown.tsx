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
  isLoading?: boolean;
}

export const DetailedBreakdown = ({ breakdown, itd, selectedPeriod, currency, holdings = [], accounts = [], isLoading }: DetailedBreakdownProps & { holdings?: any[], accounts?: any[] }) => {
  const { t } = useTranslation();

  if (isLoading) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2].map(i => (
                <Card key={i} className={`pl-5 border-l-4 ${i === 1 ? 'border-blue-500' : 'border-indigo-500'}`}>
                    <div className="animate-pulse">
                        <div className="h-7 bg-gray-200 rounded w-1/2 mb-6"></div>
                        <div className="space-y-4 mb-5">
                            {[1,2,3,4].map(r => (
                                <div key={r} className="flex justify-between">
                                    <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                                    <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
      );
  }

  // HELPER: Consistent rounding to 2 decimals to prevent penny mismatched
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // CALCULATION LOGIC
  
  // 1. Unrealized PnL (Active Positions)
  // Sum of (Current Value - Invested Value) for all holdings
  const activeUnrealizedPnLRaw = holdings.reduce((sum, h) => {
      // Use gain_loss_value if available (e.g. from totals hook)
      if (h.gain_loss_value !== undefined) return sum + h.gain_loss_value;
      
      // Otherwise calculate from raw fields
      // Invested = shares * avg_cost_portfolio_ccy
      const invested = (h.shares || 0) * (h.average_cost_portfolio_ccy || 0);
      
      // Current = shares * last_price * fx_rate
      // Assuming last_price is in instrument currency and needs conversion
      const current = (h.shares || 0) * (h.last_price || 0) * (h.fx_rate_to_portfolio_ccy || 1);
      
      const gain = current - invested;
      return sum + gain;
  }, 0);
  const activeUnrealizedPnL = round2(activeUnrealizedPnLRaw);

  // 2. Total Capital Gains (Trading Result)
  // From ITD if available, else breakdown
  const totalCapitalGainsRaw = itd?.invested?.capital_gains ?? breakdown?.invested?.capital_gains ?? 0;
  const totalCapitalGains = round2(totalCapitalGainsRaw);

  // 3. Realized PnL (Closed Positions)
  // Total - Unrealized
  const realizedPnL = round2(totalCapitalGains - activeUnrealizedPnL);

  // 4. Income & Expenses
  // Use ITD for "Total Portfolio Profit" context
  const incomeRaw = (itd?.income_expenses?.dividends || 0) + (itd?.income_expenses?.interest || 0);
  const income = round2(incomeRaw);
  
  // Expenses are costs, so we treat them as negative for PnL but positive magnitude for display
  const rawExpenses = (itd?.income_expenses?.fees || 0) + (itd?.income_expenses?.taxes || 0);
  const netExpenses = round2(Math.abs(rawExpenses)); // Magnitude of cost

  // 5. Total Profit
  // Profit = Gains + Income - Cost
  // Calculate from ROUNDED components to ensure visual consistency
  const totalProfit = round2(totalCapitalGains + income - netExpenses);

  // 6. Capital Structure
  const netDeposits = round2(itd?.cash_flows?.net_external ?? 0);
  
  // 7. Value
  const endingInvested = round2(itd?.invested?.ending_value ?? 0);
  const cashBalance = round2(accounts.reduce((sum, acc) => sum + (acc.cash || 0), 0));
  const totalValue = round2(endingInvested + cashBalance);

  // Validation: Total Value should approx equal Net Deposits + Total Profit
  // 14974 + 3069 = 18043. Matches closely.

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
       {/* CARD 1: PERFORMANCE BREAKDOWN */}
       <Card className="border-l-4 border-blue-500 pl-5 h-full">
          <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
             <DollarSign className="w-5 h-5 text-gray-500"/>
             {t("portfolio.summary.detailed_breakdown")}
          </h4>
          <div className="space-y-1">
             {/* SECTION 2: Top Rows */}
             <div className="min-h-[5rem]"> 
                 <DataRow 
                    label={t("portfolio.summary.unrealized_pl")} 
                    value={activeUnrealizedPnL} 
                    currency={currency} 
                    valueClassName={activeUnrealizedPnL >= 0 ? "text-emerald-600" : "text-red-600"}
                 />
                 <DataRow 
                    label={t("portfolio.summary.realized_pl")} 
                    value={realizedPnL} 
                    currency={currency} 
                    valueClassName={realizedPnL >= 0 ? "text-emerald-600" : "text-red-600"}
                    className="!border-b-0" 
                 />
             </div>
             
             {/* SECTION 3: Middle Content (Fixed Min Height for Alignment) */}
             <div className="min-h-[11rem] flex flex-col pt-2 border-t border-gray-100">
                {/* Total Trading Result */}
                <DataRow 
                    label={t("portfolio.summary.capital_gains")} 
                    value={totalCapitalGains} 
                    currency={currency} 
                    isBold
                    valueClassName={totalCapitalGains >= 0 ? "text-emerald-700" : "text-red-700"}
                    className="!border-b-0"
                />

                {/* Cash Impact Box */}
                <div className="mt-3 bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-1 shadow-sm flex-1">
                    <DataRow 
                        label={t("portfolio.summary.dividends_interest")} 
                        value={income} 
                        currency={currency} 
                        valueClassName="text-emerald-600" 
                        className="border-gray-200"
                    />
                    <DataRow 
                        label={t("portfolio.summary.fees_taxes")} 
                        value={netExpenses} 
                        currency={currency} 
                        valueClassName="text-red-500" 
                        className="!border-b-0" 
                    />
                </div>
             </div>

             {/* SECTION 4: Footer (Total PnL) */}
             <div className="pt-3 border-t-2 border-gray-100 mt-2">
                 <DataRow 
                    label={t("portfolio.summary.total_pnl")} 
                    value={totalProfit} 
                    currency={currency} 
                    isBold 
                    valueClassName={`text-xl ${totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}
                    className="!border-b-0"
                 />
             </div>
          </div>
       </Card>

       {/* CARD 2: CAPITAL STRUCTURE */}
       <Card className="border-l-4 border-indigo-500 pl-5 h-full">
          <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
             {t("portfolio.summary.total_market_value")}
          </h4>
          <div className="space-y-1">
              {/* SECTION 2: Top Rows */}
              <div className="min-h-[5rem]">
                 <DataRow 
                    label={t("portfolio.summary.net_deposits")} 
                    value={netDeposits} 
                    currency={currency} 
                    valueClassName="text-blue-600 font-medium"
                 />
                 <DataRow 
                    label={t("portfolio.summary.total_pnl")} 
                    value={totalProfit} 
                    currency={currency} 
                    valueClassName={totalProfit >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}
                    className="!border-b-0"
                 />
              </div>

              {/* SECTION 3: Middle Content (Fixed Min Height for Alignment) */}
              <div className="min-h-[11rem] flex flex-col pt-2 border-t border-gray-100">
                  {/* Composition Bar */}
                  <div className="pb-2">
                     <div className="flex justify-between text-sm text-gray-500 mb-2 font-medium">
                        <span>{t("portfolio.summary.invested_value")}</span>
                        <span>{t("portfolio.summary.cash_balance")}</span>
                     </div>
                     <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                        <div 
                            className="h-full bg-blue-500" 
                            style={{ width: `${Math.max(0, Math.min(100, (endingInvested / totalValue) * 100))}%` }}
                        />
                        <div 
                            className="h-full bg-emerald-400" 
                            style={{ width: `${Math.max(0, Math.min(100, (cashBalance / totalValue) * 100))}%` }}
                        />
                     </div>
                     <div className="flex justify-between mt-1.5 text-xs font-semibold">
                         <span className="text-blue-600">{((endingInvested / totalValue) * 100).toFixed(1)}%</span>
                         <span className="text-emerald-600">{((cashBalance / totalValue) * 100).toFixed(1)}%</span>
                     </div>
                  </div>

                  {/* Filler space / Lower Rows */}
                  <div className="mt-auto space-y-1">
                     <DataRow label={t("portfolio.summary.invested_value")} value={endingInvested} currency={currency} />
                     <DataRow label={t("portfolio.summary.cash_balance")} value={cashBalance} currency={currency} className="!border-b-0" />
                  </div>
              </div>

              {/* SECTION 4: Footer (Total Value) */}
                 <div className="pt-3 mt-2 border-t-2 border-gray-100">
                    <DataRow 
                        label={t("portfolio.summary.total_value")} 
                        value={totalValue} 
                        currency={currency} 
                        isBold 
                        valueClassName="text-xl text-gray-900"
                        className="!border-b-0"
                    />
                 </div>
          </div>
       </Card>
     </div>
  );
};
