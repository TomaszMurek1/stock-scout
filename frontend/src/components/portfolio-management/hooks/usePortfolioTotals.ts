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
    console.log("totalGainLoss", performance);
    if (!performance) return null;

    const totalInvested: number = portfolio.total_invested || 0;
    const totalValueBase: number = totalInvested;

    const totalGainLoss = performance.breakdowns?.itd.pnl.unrealized_gains_residual || 0;
    console.log("totalGainLoss", performance);
    const percentageChange = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
    const byHolding = holdings;
    return {
      totalValue: totalValueBase,
      totalInvested,
      totalGainLoss,
      percentageChange,
      byHolding,
    };
  }, [transactions, holdings, portfolio]);

  return totals;
}
