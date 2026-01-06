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

  // CALCULATION LOGIC
  
  // 1. Unrealized PnL (Active Positions)
  // Sum of (Current Value - Invested Value) for all holdings
  const activeUnrealizedPnL = holdings.reduce((sum, h) => {
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

  // 2. Total Capital Gains (Trading Result)
  // From ITD if available, else breakdown
  const totalCapitalGains = itd?.invested?.capital_gains ?? breakdown?.invested?.capital_gains ?? 0;

  // 3. Realized PnL (Closed Positions)
  // Total - Unrealized
  const realizedPnL = totalCapitalGains - activeUnrealizedPnL;

  // 4. Income & Expenses
  // Use ITD for "Total Portfolio Profit" context
  const income = (itd?.income_expenses?.dividends || 0) + (itd?.income_expenses?.interest || 0);
  const expenses = (itd?.income_expenses?.fees || 0) + (itd?.income_expenses?.taxes || 0); // usually positive in obj, needs negation? 
  // API normally returns positive for sums, but check if they are negative.
  // In `portfolio_metrics_service.py` they are returned as sums.
  // In `debug_income.py` result, TAX was negative (-8.3).
  // `_sum_flows` sums `quantity * currency_rate`.
  // Tax/Fee type usually has negative quantity? Or positive quantity and negative sign in sum logic?
  // Let's assume the value from `itd.income_expenses` is SIGNED correctly if it came from `_sum_flows`? 
  // Wait, `calculate_returns_breakdown` calls `_sum_flows` which sums directly.
  // If Tax q=-10, it returns -10.
  // `portfolio_metrics_service.py`: 
  // `fees = self._sum_flows(..., [TransactionType.FEE])`
  // `taxes = self._sum_flows(..., [TransactionType.TAX])`
  // So `expenses` variable here will likely be NEGATIVE if it sums negative flows.
  // But let's check UI usage: `value={(itd.income_expenses.fees + itd.income_expenses.taxes) * -1}`
  // The existing code MULTIPLIED BY -1.
  // This implies the incoming values are NEGATIVE, and we want to show them as POSITIVE cost (red colored).
  // Or incoming are POSITIVE and we want to negate?
  // `debug_income.py` showed `TAX: -8.3`. So they are negative.
  // So `fees + taxes` = negative number (e.g. -10).
  // Existing UI: `value={... * -1}` -> displays `10`.
  // I will show them as is, but styled red if negative.

  const netExpenses = (itd?.income_expenses?.fees || 0) + (itd?.income_expenses?.taxes || 0);

  // 5. Total Profit
  // Capital Gains + Income + Expenses (which are negative)
  // OR `itd.total_pnl_ex_flows` if available?
  // `PortfolioBrief` calculates `Total PnL` = `Total Value - Net Deposits`.
  // Let's stick to adding components to be explicit.
  const totalProfit = totalCapitalGains + income + netExpenses;

  // 6. Capital Structure
  const netDeposits = itd?.cash_flows?.net_external ?? 0;
  
  // 7. Value
  const endingInvested = itd?.invested?.ending_value ?? 0;
  const cashBalance = accounts.reduce((sum, acc) => sum + (acc.cash || 0), 0);
  const totalValue = endingInvested + cashBalance;

  // Validation: Total Value should approx equal Net Deposits + Total Profit
  // 14974 + 3069 = 18043. Matches closely.

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
       {/* CARD 1: PERFORMANCE BREAKDOWN */}
       <Card className="border-l-4 border-blue-500 pl-5">
          <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
             <DollarSign className="w-5 h-5 text-gray-500"/>
             {t("portfolio.summary.detailed_breakdown")}
          </h4>
          <div className="space-y-1">
             {/* 1. Active Positions */}
             <DataRow 
                label={t("portfolio.summary.unrealized_pl")} 
                value={activeUnrealizedPnL} 
                currency={currency} 
                valueClassName={activeUnrealizedPnL >= 0 ? "text-emerald-600" : "text-red-600"}
             />
             
             {/* 2. Closed Positions */}
             <DataRow 
                label={t("portfolio.summary.realized_pl")} 
                value={realizedPnL} 
                currency={currency} 
                valueClassName={realizedPnL >= 0 ? "text-emerald-600" : "text-red-600"}
             />
             
             {/* 3. Total Trading Result */}
             <div className="pt-2 mt-2 border-t border-gray-100">
                <DataRow 
                    label={t("portfolio.summary.capital_gains")} 
                    value={totalCapitalGains} 
                    currency={currency} 
                    isBold
                    valueClassName={totalCapitalGains >= 0 ? "text-emerald-700" : "text-red-700"}
                />
             </div>

             {/* 4. Cash Impact Box */}
             <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-1">
                <DataRow 
                    label={t("portfolio.summary.dividends_interest")} 
                    value={income} 
                    currency={currency} 
                    valueClassName="text-emerald-600" 
                />
                <DataRow 
                    label={t("portfolio.summary.fees_taxes")} 
                    value={netExpenses} 
                    currency={currency} 
                    valueClassName="text-red-500" 
                />
             </div>

             {/* 5. Total Portfolio Profit */}
             <div className="pt-4 mt-2 border-t border-gray-200">
                 <DataRow 
                    label={t("portfolio.summary.total_pnl")} 
                    value={totalProfit} 
                    currency={currency} 
                    isBold 
                    valueClassName={`text-xl ${totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}
                 />
             </div>
          </div>
       </Card>

       {/* CARD 2: CAPITAL STRUCTURE */}
       <Card className="border-l-4 border-indigo-500 pl-5">
          <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
             {t("portfolio.summary.total_market_value")}
          </h4>
          <div className="">
              {/* Money Sources */}
              <div className="space-y-1">
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
                 />
              </div>

              {/* Composition Bar */}
              <div className="pt-4 border-t border-gray-100">
                 <div className="flex justify-between text-sm text-gray-500 mb-2">
                    <span>{t("portfolio.summary.invested_value")}</span>
                    <span>{t("portfolio.summary.cash_balance")}</span>
                 </div>
                 {/* Visual Bar */}
                 <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
                    <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${Math.max(0, Math.min(100, (endingInvested / totalValue) * 100))}%` }}
                    />
                    <div 
                        className="h-full bg-emerald-400" 
                        style={{ width: `${Math.max(0, Math.min(100, (cashBalance / totalValue) * 100))}%` }}
                    />
                 </div>
                 <div className="flex justify-between mt-1 text-xs font-medium">
                     <span className="text-blue-600">{((endingInvested / totalValue) * 100).toFixed(1)}%</span>
                     <span className="text-emerald-600">{((cashBalance / totalValue) * 100).toFixed(1)}%</span>
                 </div>
              </div>

              {/* Final Values */}
              <div className="space-y-1 pt-2">
                 <DataRow label={t("portfolio.summary.invested_value")} value={endingInvested} currency={currency} />
                 <DataRow label={t("portfolio.summary.cash_balance")} value={cashBalance} currency={currency} />
                 
                 <div className="pt-4 mt-2 border-t border-gray-200">
                    <DataRow 
                        label={t("portfolio.summary.total_value")} 
                        value={totalValue} 
                        currency={currency} 
                        isBold 
                        valueClassName="text-xl text-gray-800"
                    />
                 </div>
              </div>
          </div>
       </Card>
     </div>
  );
};
