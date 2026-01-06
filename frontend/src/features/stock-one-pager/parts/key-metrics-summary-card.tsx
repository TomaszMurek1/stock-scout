import React from "react";
import { useTranslation } from "react-i18next";
import { Badge, Tooltip } from "@/components/ui/Layout";
import { MetricTooltipContent } from "../components/metric-tooltip-content";
import type { StockData, MetricConfig } from "../stock-one-pager.types";
import { formatPercentage } from "@/utils/formatting";
import { RefreshedCard, RefreshedHeader } from "../components/refreshed-card";

interface KeyMetricsSummaryCardProps {
  valuationMetrics: StockData["valuation_metrics"];
  investorMetrics: StockData["investor_metrics"];
  financialPerformance: StockData["financial_performance"];
  isRefreshed?: boolean;
}

const MetricItem = ({ config }: { config: MetricConfig }) => {
  const {
    label,
    value,
    description,
    definition,
    criterion,
    valueClass,
    isProgressBar,
    progressValue,
    progressThreshold,
    progressMax = 100,
  } = config;

  return (
    <Tooltip
      content={
        <MetricTooltipContent
          value={value}
          description={description}
          definition={definition}
          criterion={criterion}
        />
      }
    >
      <div className="group p-3 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all cursor-help">
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {label}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-slate-300 group-hover:text-blue-500"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </div>
        </div>

        <div className={`text-lg font-bold truncate ${valueClass || "text-slate-900"}`}>
          {value}
        </div>

        {isProgressBar && progressValue !== undefined && (
          <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressThreshold && progressValue >= progressThreshold
                  ? "bg-emerald-500"
                  : "bg-amber-500"
              }`}
              style={{
                width: `${Math.min(100, Math.max(0, (progressValue / progressMax) * 100))}%`,
              }}
            />
          </div>
        )}
      </div>
    </Tooltip>
  );
};

export const KeyMetricsSummaryCard: React.FC<KeyMetricsSummaryCardProps> = ({
  valuationMetrics,
  investorMetrics,
  financialPerformance,
  isRefreshed = false,
}) => {
  const { t } = useTranslation();

  const metrics: MetricConfig[] = [
    {
      id: "pe_ratio",
      label: t("stock_one_pager.metrics.pe_ratio.label"),
      value: valuationMetrics.pe_ratio?.toFixed(2) || "N/A",
      description: t("stock_one_pager.metrics.pe_ratio.description"),
      definition: t("stock_one_pager.metrics.pe_ratio.definition"),
      criterion: t("stock_one_pager.metrics.pe_ratio.criterion"),
      valueClass: "text-slate-900",
      isProgressBar: false,
    },
    {
      id: "ev_ebitda",
      label: t("stock_one_pager.metrics.ev_ebitda.label"),
      value: valuationMetrics.ev_ebitda?.toFixed(2) || "N/A",
      description: t("stock_one_pager.metrics.ev_ebitda.description"),
      definition: t("stock_one_pager.metrics.ev_ebitda.definition"),
      criterion: t("stock_one_pager.metrics.ev_ebitda.criterion"),
      valueClass: "text-slate-900",
      isProgressBar: false,
    },
    {
      id: "revenue_growth",
      label: t("stock_one_pager.metrics.revenue_growth.label"),
      value: investorMetrics.revenue_growth != null ? `${investorMetrics.revenue_growth.toFixed(2)}%` : "N/A",
      description: t("stock_one_pager.metrics.revenue_growth.description"),
      definition: t("stock_one_pager.metrics.revenue_growth.definition"),
      criterion: t("stock_one_pager.metrics.revenue_growth.criterion"),
      valueClass:
        (investorMetrics.revenue_growth ?? 0) >= 10
          ? "text-emerald-600"
          : (investorMetrics.revenue_growth ?? 0) >= 0
            ? "text-amber-600"
            : "text-rose-600",
      isProgressBar: true,
      progressValue: investorMetrics.revenue_growth ?? 0,
      progressThreshold: 10,
      progressMax: 30,
    },
    {
      id: "gross_margin",
      label: t("stock_one_pager.metrics.gross_margin.label"),
      value: formatPercentage(financialPerformance.gross_margin),
      description: t("stock_one_pager.metrics.gross_margin.description"),
      definition: t("stock_one_pager.metrics.gross_margin.definition"),
      criterion: t("stock_one_pager.metrics.gross_margin.criterion"),
      valueClass: (financialPerformance.gross_margin ?? 0) > 0.5 ? "text-emerald-600" : "text-slate-900",
      isProgressBar: true,
      progressValue: (financialPerformance.gross_margin ?? 0) * 100,
      progressThreshold: 50,
      progressMax: 90,
    },
    {
      id: "net_margin",
      label: t("stock_one_pager.metrics.net_margin.label"),
      value: formatPercentage(financialPerformance.net_margin),
      description: t("stock_one_pager.metrics.net_margin.description"),
      definition: t("stock_one_pager.metrics.net_margin.definition"),
      criterion: t("stock_one_pager.metrics.net_margin.criterion"),
      valueClass: (financialPerformance.net_margin ?? 0) > 0.15 ? "text-emerald-600" : "text-slate-900",
      isProgressBar: true,
      progressValue: (financialPerformance.net_margin ?? 0) * 100,
      progressThreshold: 15, // e.g. 15% is good
      progressMax: 40,
    },
    {
      id: "rule_of_40",
      label: t("stock_one_pager.metrics.rule_of_40.label"),
      value: investorMetrics.rule_of_40 != null ? `${investorMetrics.rule_of_40.toFixed(2)}%` : "N/A",
      description: t("stock_one_pager.metrics.rule_of_40.description"),
      definition: t("stock_one_pager.metrics.rule_of_40.definition"),
      criterion: t("stock_one_pager.metrics.rule_of_40.criterion"),
      valueClass: (investorMetrics.rule_of_40 ?? 0) >= 40 ? "text-emerald-600" : "text-amber-600",
      isProgressBar: true,
      progressValue: investorMetrics.rule_of_40 ?? 0,
      progressThreshold: 40,
      progressMax: 60,
    },
  ];

  return (
    <RefreshedCard isRefreshed={isRefreshed} className="shadow-sm border-slate-200">
      <RefreshedHeader isRefreshed={isRefreshed} className="px-5 py-4 border-b border-slate-100 flex justify-between items-center rounded-t-lg bg-slate-50/50">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wide">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-600"
          >
            <path d="M12 2v20" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          {t("stock_one_pager.metric_groups.key_metrics")}
        </h3>
        <Badge variant="neutral">FY 2024</Badge>
      </RefreshedHeader>



      <div className="p-4">
        <div className="grid grid-cols-2 gap-x-2 gap-y-4">
          {metrics.map((m) => (
            <MetricItem key={m.label} config={m} />
          ))}
        </div>
      </div>
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/30 rounded-b-lg">
        <p className="text-[10px] text-slate-400 text-center">
          {t("stock_one_pager.key_metrics_card.hover_info")}
        </p>
      </div>
    </RefreshedCard>
  );
};

export default KeyMetricsSummaryCard;
