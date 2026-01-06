import { FC } from "react";
import { useTranslation } from "react-i18next";
import { formatPercentage } from "@/utils/formatting";
import { TrendingDown, TrendingUp, Activity, AlertTriangle, ArrowRight } from "lucide-react"; // Import ArrowRight for neutral performance
import { Tooltip } from "@/components/ui/Layout";
import { MetricTooltipContent } from "./metric-tooltip-content";

interface ChartMetricsProps {
  volatility: number;
  maxDrawdown: number;
  percentFromMin: number;
  percentFromMax: number;
  periodPerformance: number; // New prop for period performance
}

export const ChartMetrics: FC<ChartMetricsProps> = ({
  volatility,
  maxDrawdown,
  percentFromMin,
  percentFromMax,
  periodPerformance,
}) => {
  const { t } = useTranslation();

  const getVolatilityStyles = (val: number) => {
    if (val < 0.2) return { color: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-100" };
    if (val < 0.4) return { color: "text-yellow-700", bgColor: "bg-yellow-50", borderColor: "border-yellow-100" };
    return { color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-100" };
  };

  const getDrawdownStyles = (val: number) => {
    const absVal = Math.abs(val);
    if (absVal < 0.1) return { color: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-100" };
    if (absVal < 0.2) return { color: "text-yellow-700", bgColor: "bg-yellow-50", borderColor: "border-yellow-100" };
    return { color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-100" };
  };

  const getFromMinStyles = (val: number) => {
    if (val > 0.2) return { color: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-100" };
    return { color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-100" };
  };

  const getFromMaxStyles = (val: number) => {
    if (val > -0.1) return { color: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-100" };
    if (val > -0.2) return { color: "text-yellow-700", bgColor: "bg-yellow-50", borderColor: "border-yellow-100" };
    return { color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-100" };
  };

  const getPerformanceStyles = (val: number) => {
    if (val > 0) return { color: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-100" };
    if (val < 0) return { color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-100" };
    return { color: "text-slate-700", bgColor: "bg-slate-50", borderColor: "border-slate-100" };
  };

  const volatilityStyles = getVolatilityStyles(volatility);
  const drawdownStyles = getDrawdownStyles(maxDrawdown);
  const fromMinStyles = getFromMinStyles(percentFromMin);
  const fromMaxStyles = getFromMaxStyles(percentFromMax);
  const performanceStyles = getPerformanceStyles(periodPerformance);

  const metrics = [
    {
      label: t("stock_one_pager.chart_metrics.performance.label"),
      value: `${periodPerformance > 0 ? "+" : ""}${formatPercentage(periodPerformance)}`,
      icon: periodPerformance > 0 ? TrendingUp : periodPerformance < 0 ? TrendingDown : ArrowRight,
      description: t("stock_one_pager.chart_metrics.performance.description"),
      definition: t("stock_one_pager.chart_metrics.performance.definition"),
      ...performanceStyles,
    },
    {
      label: t("stock_one_pager.chart_metrics.volatility.label"),
      value: formatPercentage(volatility),
      icon: Activity,
      description: t("stock_one_pager.chart_metrics.volatility.description"),
      definition: t("stock_one_pager.chart_metrics.volatility.definition"),
      ...volatilityStyles,
    },
    {
      label: t("stock_one_pager.chart_metrics.max_drawdown.label"),
      value: formatPercentage(maxDrawdown),
      icon: AlertTriangle,
      description: t("stock_one_pager.chart_metrics.max_drawdown.description"),
      definition: t("stock_one_pager.chart_metrics.max_drawdown.definition"),
      ...drawdownStyles,
    },
    {
      label: t("stock_one_pager.chart_metrics.from_min.label"),
      value: `${percentFromMin > 0 ? "+" : ""}${formatPercentage(percentFromMin)}`,
      icon: TrendingUp,
      description: t("stock_one_pager.chart_metrics.from_min.description"),
      definition: t("stock_one_pager.chart_metrics.from_min.definition"),
      ...fromMinStyles,
    },
    {
      label: t("stock_one_pager.chart_metrics.from_max.label"),
      value: `${percentFromMax > 0 ? "+" : ""}${formatPercentage(percentFromMax)}`,
      icon: TrendingDown,
      description: t("stock_one_pager.chart_metrics.from_max.description"),
      definition: t("stock_one_pager.chart_metrics.from_max.definition"),
      ...fromMaxStyles,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 w-full mt-6">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={`flex items-center gap-2.5 p-2 rounded-lg border ${metric.borderColor} ${metric.bgColor} backdrop-blur-sm transition-transform hover:scale-[1.02]`}
        >
          <div className={`p-1.5 rounded-md bg-white/80 shadow-sm ${metric.color}`}>
            <metric.icon className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col leading-none gap-1 mt-2">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider opacity-80">
                {metric.label}
              </p>
              <Tooltip
                content={
                  <MetricTooltipContent
                    value={metric.value}
                    description={metric.description}
                    definition={metric.definition}
                    labels={{ 
                      definition: t("stock_one_pager.tooltip.formula"), 
                      criterion: t("stock_one_pager.tooltip.threshold") 
                    }}
                  />
                }
              >
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
                  className="text-slate-300 hover:text-blue-500 cursor-help"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
              </Tooltip>
            </div>
            <p className={`text-xs font-bold ${metric.color} font-mono`}>{metric.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
