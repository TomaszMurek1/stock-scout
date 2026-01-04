import React from "react";
import { PieChart, ArrowDownRight, DollarSign, Wallet, TrendingUp } from "lucide-react";
import { Card, Label, Value } from "./SummaryShared";
import { Portfolio, PortfolioPerformance } from "../../../types";
import { useTranslation } from "react-i18next";

interface PortfolioBriefProps {
  portfolio: Portfolio;
  accounts: any[];
  performance: PortfolioPerformance;
  currency: any;
}

export const PortfolioBrief = ({ portfolio, accounts, performance, currency }: PortfolioBriefProps) => {
  const itd = performance?.breakdowns?.itd;
  const { t } = useTranslation();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <Card>
         <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><PieChart size={20} /></div>
          <Label tooltip="Current market value of all your active holdings.">{t("portfolio.summary.invested_value")}</Label>
        </div>
        <Value value={portfolio.invested_value_current} currency={currency} />
      </Card>
      
      {/* NEW CARD: Net Deposit */}
      <Card>
         <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><ArrowDownRight size={20} /></div>
          <Label tooltip="Total Net Deposits (Deposits - Withdrawals). This is the actual cash you have put into the portfolio.">{t("portfolio.summary.net_deposits")}</Label>
        </div>
        <Value value={portfolio.net_invested_cash} currency={currency} />
      </Card>

      <Card>
         <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><DollarSign size={20} /></div>
          <Label>{t("portfolio.summary.cash_available")}</Label>
        </div>
        <Value value={accounts?.reduce((sum: number, acc: any) => sum + (acc.cash || 0), 0) || 0} currency={currency} />
      </Card>
      <Card>
         <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Wallet size={20} /></div>
          <Label>{t("portfolio.summary.total_value")}</Label>
        </div>
        <Value value={portfolio.total_value} currency={currency} />
      </Card>
      
      <Card>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><TrendingUp size={20} /></div>
           <Label tooltip="Total Profit or Loss on your investments (Current Value - Net Cost). Includes both realized and unrealized gains.">{t("portfolio.summary.total_pnl_itd")}</Label>
        </div>
        <Value 
          value={itd?.invested ? itd.invested.capital_gains : (itd?.pnl?.unrealized_gains_residual || 0)} 
          currency={currency} 
          className={(itd?.invested ? itd.invested.capital_gains : (itd?.pnl?.unrealized_gains_residual || 0)) >= 0 ? "text-green-600" : "text-red-600"}
        />
      </Card>
    </div>
  );
};
