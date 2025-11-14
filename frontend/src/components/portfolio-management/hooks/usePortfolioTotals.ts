import { useMemo } from "react";
import { calculateInvestedPerHolding } from "../utils/calculations";
import { Portfolio, PortfolioPerformance, Transaction } from "../types";
import { Holdings } from "@/store/portfolio";

export function usePortfolioTotals({
  portfolio,
  performance,
  transactions,
  holdings,
}: {
  portfolio: Portfolio;
  performance: PortfolioPerformance;
  transactions: Transaction[];
  holdings: Holdings;
}) {
  const totals = useMemo(() => {
    if (!performance) return null;
    const { total_value, cash_available, invested_value_current, net_invested_cash } = portfolio;
    const totalGainLoss = performance.breakdowns?.itd.pnl.unrealized_gains_residual || 0;
    const percentageChange = net_invested_cash > 0 ? (totalGainLoss / net_invested_cash) * 100 : 0;
    const byHolding = holdings;
    return {
      totalValue: total_value || 0,
      invested_value_current: invested_value_current || 0,
      totalInvested: net_invested_cash || 0,
      totalGainLoss,
      percentageChange,
      byHolding,
    };
  }, [transactions, holdings, portfolio]);

  return totals;
}
