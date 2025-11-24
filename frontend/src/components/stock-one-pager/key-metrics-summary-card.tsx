import { FC } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TagIcon } from "@heroicons/react/24/outline";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { StockData } from "./stock-one-pager.types";
import { formatPercentage } from "@/utils/formatting";

interface KeyMetricsSummaryCardProps {
  valuationMetrics: StockData["valuation_metrics"];
  investorMetrics: StockData["investor_metrics"];
  financialPerformance: StockData["financial_performance"];
}

const KeyMetricsSummaryCard: FC<KeyMetricsSummaryCardProps> = ({
  valuationMetrics,
  investorMetrics,
  financialPerformance,
}) => {
  const keyMetrics = [
    {
      label: "P/E Ratio",
      value: valuationMetrics.pe_ratio?.toFixed(2) || "N/A",
      description: "Stosunek ceny akcji do zysków; ile płacisz za 1 USD zysku.",
      definition: "P/E = Price per Share / Earnings per Share (EPS)",
      criterion: "Typowo 10–25 uznawane za rozsądny przedział; skrajne wartości wymagają uzasadnienia.",
      valueClass: "text-gray-900",
    },
    {
      label: "EV/EBITDA",
      value: valuationMetrics.ev_ebitda?.toFixed(2) || "N/A",
      description: "Wycena względna wobec EBITDA, neutralna na strukturę kapitału.",
      definition: "EV/EBITDA = Enterprise Value / EBITDA",
      criterion: "Niżej zwykle taniej vs. rynek/branża; porównuj do mediany sektorowej.",
      valueClass: "text-gray-900",
    },
    {
      label: "Revenue Growth",
      value: `${investorMetrics.revenue_growth.toFixed(2)}%`,
      description: "Tempo wzrostu przychodu rok do roku; powinno być dodatnie.",
      definition: "YoY Revenue Growth",
      criterion: "Stabilnie dodatnie tempo; >10% to solidne tempo wzrostu.",
      valueClass: investorMetrics.revenue_growth >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "Gross Margin",
      value: formatPercentage(financialPerformance.gross_margin),
      description: "Marża brutto po kosztach wytworzenia; odzwierciedla siłę cenową i efektywność produkcji.",
      definition: "Gross Margin = (Revenue − COGS) / Revenue",
      criterion: "Wyższa niż w branży to przewaga; spadki mogą sygnalizować presję kosztową.",
      valueClass: "text-gray-900",
    },
    {
      label: "Net Margin",
      value: formatPercentage(financialPerformance.net_margin),
      description: "Rentowność netto po wszystkich kosztach i podatkach.",
      definition: "Net Margin = Net Income / Revenue",
      criterion: "Stabilny lub rosnący trend; porównuj do mediany w branży.",
      valueClass: "text-gray-900",
    },
    {
      label: "Rule of 40",
      value: `${investorMetrics.rule_of_40.toFixed(2)}%`,
      description: "Heurystyka równowagi wzrostu i rentowności; >40% uchodzi za zdrowy miks.",
      definition: "Rule of 40 = Revenue Growth + Profit Margin (np. FCF/EBITDA).",
      criterion: "Powyżej 40% – zielone światło; 30–40% – w porządku, poniżej 30% – do poprawy.",
      valueClass: investorMetrics.rule_of_40 >= 40 ? "text-green-600" : "text-amber-600",
    },
  ];

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
          <TagIcon className="h-5 w-5 text-primary" />
          Key Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-4">
          {keyMetrics.map(({ label, value, description, definition, criterion, valueClass }) => (
            <TooltipProvider key={label}>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <div className="space-y-1 cursor-help">
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className={`text-lg font-semibold ${valueClass}`}>{value}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[320px] bg-white border border-gray-200 p-4 rounded-lg shadow-xl">
                  <div className="space-y-3 break-words">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Wartość
                      </h4>
                      <p className="text-sm font-semibold text-gray-900 tabular-nums break-words">{value}</p>
                    </div>
                    {description && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Co to znaczy?
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
                      </div>
                    )}
                    {definition && (
                      <div className="pt-2 border-t border-gray-100">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Definicja
                        </h4>
                        <p className="text-sm font-medium text-gray-900">{definition}</p>
                      </div>
                    )}
                    {criterion && (
                      <div className="pt-2 border-t border-gray-100">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Kryterium
                        </h4>
                        <p className="text-sm font-medium text-gray-900">{criterion}</p>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default KeyMetricsSummaryCard;
