import React from "react";
import { Card, Badge, Tooltip } from "@/components/ui/Layout";
import type { StockData } from "./stock-one-pager.types";
import { formatPercentage } from "@/utils/formatting";

interface KeyMetricsSummaryCardProps {
  valuationMetrics: StockData["valuation_metrics"];
  investorMetrics: StockData["investor_metrics"];
  financialPerformance: StockData["financial_performance"];
}

interface MetricConfig {
  label: string;
  value: string | number;
  description: string;
  definition: string;
  criterion: string;
  valueClass?: string;
  isProgressBar?: boolean;
  progressValue?: number; // 0-100
  progressThreshold?: number; // Value at which it becomes "good"
  progressMax?: number;
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
        <div className="space-y-3 text-left">
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Value
            </h4>
            <p className="font-mono text-emerald-400 font-semibold">{value}</p>
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              What it means
            </h4>
            <p className="text-slate-300 leading-snug">{description}</p>
          </div>
          <div className="border-t border-slate-700 pt-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Definition
            </h4>
            <p className="text-slate-400 italic">{definition}</p>
          </div>
          <div className="border-t border-slate-700 pt-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Criterion
            </h4>
            <p className="text-slate-300">{criterion}</p>
          </div>
        </div>
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
}) => {
  const metrics: MetricConfig[] = [
    {
      label: "P/E Ratio",
      value: valuationMetrics.pe_ratio?.toFixed(2) || "N/A",
      description: "Stosunek ceny akcji do zysków; ile płacisz za 1 USD zysku.",
      definition: "P/E = Price per Share / Earnings per Share (EPS)",
      criterion:
        "Typowo 10–25 uznawane za rozsądny przedział; skrajne wartości wymagają uzasadnienia.",
      valueClass: "text-slate-900",
      isProgressBar: false,
    },
    {
      label: "EV/EBITDA",
      value: valuationMetrics.ev_ebitda?.toFixed(2) || "N/A",
      description: "Wycena względna wobec EBITDA, neutralna na strukturę kapitału.",
      definition: "EV/EBITDA = Enterprise Value / EBITDA",
      criterion: "Niżej zwykle taniej vs. rynek/branża; porównuj do mediany sektorowej.",
      valueClass: "text-slate-900",
      isProgressBar: false,
    },
    {
      label: "Revenue Growth",
      value: `${investorMetrics.revenue_growth.toFixed(2)}%`,
      description: "Tempo wzrostu przychodu rok do roku; powinno być dodatnie.",
      definition: "YoY Revenue Growth",
      criterion: "Stabilnie dodatnie tempo; >10% to solidne tempo wzrostu.",
      valueClass:
        investorMetrics.revenue_growth >= 10
          ? "text-emerald-600"
          : investorMetrics.revenue_growth >= 0
            ? "text-amber-600"
            : "text-rose-600",
      isProgressBar: true,
      progressValue: investorMetrics.revenue_growth,
      progressThreshold: 10,
      progressMax: 30,
    },
    {
      label: "Gross Margin",
      value: formatPercentage(financialPerformance.gross_margin),
      description:
        "Marża brutto po kosztach wytworzenia; odzwierciedla siłę cenową i efektywność produkcji.",
      definition: "Gross Margin = (Revenue − COGS) / Revenue",
      criterion: "Wyższa niż w branży to przewaga; spadki mogą sygnalizować presję kosztową.",
      valueClass: financialPerformance.gross_margin > 0.5 ? "text-emerald-600" : "text-slate-900",
      isProgressBar: true,
      progressValue: financialPerformance.gross_margin * 100,
      progressThreshold: 50,
      progressMax: 90,
    },
    {
      label: "Net Margin",
      value: formatPercentage(financialPerformance.net_margin),
      description: "Rentowność netto po wszystkich kosztach i podatkach.",
      definition: "Net Margin = Net Income / Revenue",
      criterion: "Stabilny lub rosnący trend; porównuj do mediany w branży.",
      valueClass: financialPerformance.net_margin > 0.15 ? "text-emerald-600" : "text-slate-900",
      isProgressBar: true,
      progressValue: financialPerformance.net_margin * 100,
      progressThreshold: 15, // e.g. 15% is good
      progressMax: 40,
    },
    {
      label: "Rule of 40",
      value: `${investorMetrics.rule_of_40.toFixed(2)}%`,
      description: "Heurystyka równowagi wzrostu i rentowności; >40% uchodzi za zdrowy miks.",
      definition: "Rule of 40 = Revenue Growth + Profit Margin (np. FCF/EBITDA).",
      criterion: "Powyżej 40% – zielone światło; 30–40% – w porządku, poniżej 30% – do poprawy.",
      valueClass: investorMetrics.rule_of_40 >= 40 ? "text-emerald-600" : "text-amber-600",
      isProgressBar: true,
      progressValue: investorMetrics.rule_of_40,
      progressThreshold: 40,
      progressMax: 60,
    },
  ];

  return (
    <Card className="bg-white shadow-sm border-slate-200">
      <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-lg">
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
          Key Metrics
        </h3>
        <Badge variant="neutral">FY 2024</Badge>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-x-2 gap-y-4">
          {metrics.map((m) => (
            <MetricItem key={m.label} config={m} />
          ))}
        </div>
      </div>
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/30 rounded-b-lg">
        <p className="text-[10px] text-slate-400 text-center">
          Hover info icon for definitions & criteria
        </p>
      </div>
    </Card>
  );
};

export default KeyMetricsSummaryCard;
