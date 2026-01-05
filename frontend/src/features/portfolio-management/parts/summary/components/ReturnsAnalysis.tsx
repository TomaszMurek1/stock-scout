import React from "react";
import { Card, Label, PercentValue } from "./SummaryShared";
import { Period } from "../../../types";
import { useTranslation } from "react-i18next";

interface ReturnsAnalysisProps {
  breakdown: any;
  perf: any;
  selectedPeriod: Period;
  isLoading?: boolean;
}

export const ReturnsAnalysis = ({ breakdown, perf, selectedPeriod, isLoading }: ReturnsAnalysisProps) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Simple Return - PRIMARY METRIC (most intuitive) */}
      <Card className={`${
        (breakdown?.invested?.simple_return_pct || 0) >= 0 
          ? 'border-l-4 border-emerald-500' 
          : 'border-l-4 border-red-500'
      }`}>
        <Label tooltip={t("portfolio.summary.tooltips.money_made_lost")}>
           {t("portfolio.summary.money_made_lost")}
        </Label>
        <PercentValue 
          value={breakdown?.invested?.simple_return_pct ? parseFloat(breakdown.invested.simple_return_pct) : 0} 
        />
        <div className="text-xs text-gray-500 mt-1">{t("portfolio.summary.simple_return")}</div>
      </Card>
      
      {/* 2. TTWR Invested - Stock picking quality */}
      <Card>
        <Label tooltip={t("portfolio.summary.tooltips.pick_quality")}>
           {t("portfolio.summary.pick_quality")}
        </Label>
        <PercentValue value={perf?.ttwr_invested?.[selectedPeriod] ?? 0} />
         <div className="text-xs text-gray-500 mt-1">{t("portfolio.summary.ttwr_invested")}</div>
      </Card>
      
      {/* 3. TTWR Portfolio - Overall strategy including cash */}
      <Card>
        <Label tooltip={t("portfolio.summary.tooltips.strategy_quality")}>
           {t("portfolio.summary.strategy_quality")}
        </Label>
        <PercentValue value={perf?.ttwr?.[selectedPeriod] ?? 0} />
        <div className="text-xs text-gray-500 mt-1">{t("portfolio.summary.ttwr_portfolio")}</div>
      </Card>
      
      {/* 4. MWRR - Personal IRR */}
      <Card>
        <Label tooltip={t("portfolio.summary.tooltips.personal_return")}>
           {t("portfolio.summary.personal_return")}
        </Label>
        <PercentValue value={perf?.mwrr?.[selectedPeriod] ?? 0} />
         <div className="text-xs text-gray-500 mt-1">{t("portfolio.summary.mwrr_irr")}</div>
      </Card>
    </div>
  );
};
