import React from "react";
import { PieChart, ArrowDownRight, DollarSign, Wallet, TrendingUp } from "lucide-react";
import { Card, Label, Value } from "./SummaryShared";
import { Portfolio, PortfolioPerformance } from "../../../types";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

interface PortfolioBriefProps {
  portfolio: Portfolio;
  accounts: any[];
  performance: PortfolioPerformance;
  currency: any;
  isLoading?: boolean;
}

export const PortfolioBrief = ({ portfolio, accounts, performance, currency, isLoading }: PortfolioBriefProps) => {
  const itd = performance?.breakdowns?.itd;
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-gray-100 rounded-lg"></div>
              <div className="h-4 bg-gray-100 rounded w-24"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-32 mt-2"></div>
          </Card>
        ))}
      </div>
    );
  }
  
  // Prioritize performance data (ITD) if available to match DetailedBreakdown
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const investedValue = round2(itd?.invested?.ending_value ?? portfolio.invested_value_current);
  const cashValue = round2(accounts?.reduce((sum: number, acc: any) => sum + (acc.cash || 0), 0) || 0);
  const totalValue = round2(investedValue + cashValue);
  const netDeposits = round2(itd?.cash_flows?.net_external ?? portfolio.net_deposits ?? portfolio.net_invested_cash);
  
  // Calculate PnL:
  // Option A (Asset Method): Total Value - Net Deposits
  // Option B (Component Method): Gains + Income - Expenses
  // We prioritize Option B to match DetailedBreakdown exactly.
  let totalPnL = 0;
  if (itd) {
     const gains = itd.invested?.capital_gains ?? 0;
     const income = (itd.income_expenses?.dividends ?? 0) + (itd.income_expenses?.interest ?? 0);
     const expenses = Math.abs((itd.income_expenses?.fees ?? 0) + (itd.income_expenses?.taxes ?? 0));
     totalPnL = round2(gains + income - expenses);
  } else {
     totalPnL = round2(totalValue - netDeposits);
  }

  const handleCopyAccount = () => {
      // Use first available IBAN from accounts
      const accountWithIban = accounts?.find(a => a.iban);
      
      if (accountWithIban?.iban) {
          navigator.clipboard.writeText(accountWithIban.iban);
          toast.success(t("portfolio.summary.bank_account_copied"), {
              position: "bottom-right",
              autoClose: 3000
          });
      }
  };
  
  const hasIban = accounts?.some(a => a.iban);

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
       <Card>
         <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Wallet size={20} /></div>
          <Label>{t("portfolio.summary.total_value")}</Label>
        </div>
        <Value value={totalValue} currency={currency} />
      </Card>
      <Card>
         <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><PieChart size={20} /></div>
          <Label tooltip={t("portfolio.summary.tooltips.invested_value")}>{t("portfolio.summary.invested_value")}</Label>
        </div>
        <Value value={investedValue} currency={currency} />
      </Card>
    
      <Card>
         <div className="flex items-center gap-3 mb-2">
            <button 
                onClick={hasIban ? handleCopyAccount : undefined}
                className={`p-2 rounded-lg transition-all duration-700 ${
                    hasIban 
                    ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse-slow" 
                    : "bg-emerald-50 text-emerald-600 cursor-default"
                }`}
                title={hasIban ? t("portfolio.summary.copy_bank_account") : undefined}
            >
                <DollarSign size={20} />
            </button>
            <Label>{t("portfolio.summary.cash_available")}</Label>
        </div>
        <Value value={cashValue} currency={currency} />
      </Card>

       <Card>
         <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><ArrowDownRight size={20} /></div>
          <Label tooltip={t("portfolio.summary.tooltips.net_deposits")}>{t("portfolio.summary.net_deposits")}</Label>
        </div>
        <Value value={netDeposits} currency={currency} />
      </Card>
   
      <Card>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><TrendingUp size={20} /></div>
           <Label tooltip={t("portfolio.summary.tooltips.total_pnl_lifetime")}>
             {t("portfolio.summary.total_pnl")}
           </Label>
        </div>
        <Value 
          value={totalPnL} 
          currency={currency} 
          className={totalPnL >= 0 ? "text-green-600" : "text-red-600"}
        />
      </Card>
    </div>
  );
};
