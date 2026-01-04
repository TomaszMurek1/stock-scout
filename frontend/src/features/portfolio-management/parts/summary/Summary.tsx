// src/components/Summary.tsx
import React from "react";
import { TrendingUp } from "lucide-react";
import { Portfolio, PortfolioPerformance, Period } from "../../types";

import { PeriodSelector } from "./components/SummaryShared";
import { PortfolioBrief } from "./components/PortfolioBrief";
import { ReturnsAnalysis } from "./components/ReturnsAnalysis";
import { DetailedBreakdown } from "./components/DetailedBreakdown";
import { SummaryEmptyState, SummaryLoadingState } from "./components/SummaryEmptyState";

interface SummaryProps {
  portfolio: Portfolio;
  accounts: any[]; // Or import Account type
  performance: PortfolioPerformance;
  holdings?: any[]; // Optional list of holdings
  selectedPeriod: Period;
  onPeriodChange: (p: Period) => void;
}

export default function Summary({ portfolio, accounts, performance, holdings, selectedPeriod, onPeriodChange }: SummaryProps) {
  const { currency } = portfolio;
  const breakdown = performance?.breakdowns?.[selectedPeriod] || performance?.breakdowns?.ytd || performance?.breakdowns?.itd;
  const itd = performance?.breakdowns?.itd;
  const perf = performance?.performance;

  const hasPerformance = !!(breakdown && itd && perf);
  const hasHoldings = (portfolio.invested_value_current > 0) || (holdings && holdings.length > 0);

  return (
    <div className="space-y-8">
      {/* 1. Top Level Brief (Invested, Net Deposits, Cash, PnL) */}
      <PortfolioBrief 
        portfolio={portfolio} 
        accounts={accounts} 
        performance={performance} 
        currency={currency} 
      />

      {/* 2. States or Detailed Analysis */}
      {!hasHoldings ? (
        <SummaryEmptyState />
      ) : !hasPerformance ? (
        <SummaryLoadingState />
      ) : (
        <>
          {/* Header & Period Selector */}
          <div className="flex items-center justify-between pt-2">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-500" />
                Returns Analysis ({selectedPeriod.toUpperCase()})
            </h3>
            <PeriodSelector selected={selectedPeriod} onSelect={onPeriodChange} />
          </div>

          {/* 3. Returns Cards */}
          <ReturnsAnalysis 
            breakdown={breakdown} 
            perf={perf} 
            selectedPeriod={selectedPeriod} 
          />

          {/* 4. Detailed Breakdown Tables */}
          <DetailedBreakdown 
            breakdown={breakdown} 
            itd={itd} 
            selectedPeriod={selectedPeriod} 
            currency={currency} 
          />
        </>
      )}
    </div>
  );
}
