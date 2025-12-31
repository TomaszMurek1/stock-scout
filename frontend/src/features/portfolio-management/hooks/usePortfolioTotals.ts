import { useMemo } from "react";
import { ApiHolding, Portfolio, PortfolioPerformance } from "../types";

export function usePortfolioTotals({
  portfolio,
  performance,
  holdings,
}: {
  portfolio: Portfolio;
  performance: PortfolioPerformance;
  holdings: ApiHolding[];
}) {
  const totals = useMemo(() => {
    if (!performance) return null;
    const { total_value, invested_value_current, net_invested_cash } = portfolio;
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
  }, [holdings, portfolio, performance]);

  return totals;
}
