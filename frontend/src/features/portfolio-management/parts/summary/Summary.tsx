// src/components/Summary.tsx
import React from "react";
import { TrendingUp } from "lucide-react";
import { Portfolio, PortfolioPerformance, Period } from "../../types";

import { PeriodSelector } from "./components/SummaryShared";
import { PortfolioBrief } from "./components/PortfolioBrief";
import { ReturnsAnalysis } from "./components/ReturnsAnalysis";
import { DetailedBreakdown } from "./components/DetailedBreakdown";
import { SummaryEmptyState, SummaryLoadingState } from "./components/SummaryEmptyState";
import { useTranslation } from "react-i18next";

interface SummaryProps {
  portfolio: Portfolio;
  accounts: any[]; // Or import Account type
  performance: PortfolioPerformance;
  holdings?: any[]; // Optional list of holdings
  selectedPeriod: Period;
  onPeriodChange: (p: Period) => void;
  isLoading?: boolean;
}

export default function Summary({ portfolio, accounts, performance, holdings, selectedPeriod, onPeriodChange, isLoading }: SummaryProps) {
  const { currency } = portfolio;
  const { t } = useTranslation();
  const breakdown = performance?.breakdowns?.[selectedPeriod] || performance?.breakdowns?.ytd || performance?.breakdowns?.itd;
  const itd = performance?.breakdowns?.itd;
  const perf = performance?.performance;

  const hasPerformance = !!(breakdown && itd && perf);
  const hasHoldings = (portfolio.invested_value_current > 0) || (holdings && holdings.length > 0);

  // If loading, we calculate effective loading states for children.
  // We want to show skeletons if we are globally loading.
  const isGlobalLoading = isLoading; 
  // Partial loading for performance (if core loaded but perf pending)
  const isPerfLoading = isGlobalLoading || !hasPerformance;

  return (
    <div className="space-y-8">
      {/* 1. Top Level Brief (Invested, Net Deposits, Cash, PnL) */}
      <PortfolioBrief 
        portfolio={portfolio} 
        accounts={accounts} 
        performance={performance} 
        currency={currency} 
        isLoading={isPerfLoading}
      />

      {/* 2. States or Detailed Analysis */}
      {!hasHoldings && !isGlobalLoading ? (
        <SummaryEmptyState />
      ) : (
        <>
          {/* Header & Period Selector */}
          <div className="flex items-center justify-between pt-2">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-500" />
                {t("portfolio.summary.returns_analysis")} ({selectedPeriod.toUpperCase()})
            </h3>
            <PeriodSelector selected={selectedPeriod} onSelect={onPeriodChange} />
          </div>

          {/* 3. Returns Cards (Handles its own loading state) */}
          <ReturnsAnalysis 
            breakdown={breakdown} 
            perf={perf} 
            selectedPeriod={selectedPeriod}
            isLoading={isPerfLoading}
          />

          {/* 4. Detailed Breakdown Tables */}
          <DetailedBreakdown 
            breakdown={breakdown} 
            itd={itd} 
            selectedPeriod={selectedPeriod} 
            currency={currency}
            holdings={holdings}
            accounts={accounts}
            isLoading={!hasPerformance}
          />
        </>
      )}
    </div>
  );
}
