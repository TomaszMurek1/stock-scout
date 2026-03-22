import React from "react";
import { IGmmaSqueezeResultItem } from "./gmma-squeeze-form.types";
import { DefaultScanResultList } from "../../shared/default-scan-results";
import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";

const TrendBadge = ({ trend }: { trend: "up" | "down" }) => (
  <span
    data-id={`trend-${trend}`}
    className={`
      inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0
      ${trend === "up"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-red-100 text-red-700"
      }
    `}
  >
    {trend === "up" ? "▲ Up" : "▼ Down"}
  </span>
);

interface ResultRowProps {
  stock: IGmmaSqueezeResultItem;
}

const ResultRow: React.FC<ResultRowProps> = ({ stock }) => {
  return (
    <div
      data-id={`gmma-result-${stock.ticker.toLowerCase()}`}
      className="
        flex flex-wrap items-center gap-3
        bg-white p-4
        rounded-lg border border-slate-300
        hover:bg-slate-100 transition shadow-sm
      "
    >
      {/* Trend badge */}
      <TrendBadge trend={stock.trend} />
      {/* Name + Ticker */}
      <div
        className="flex-shrink-0 min-w-0 max-w-[200px]"
        title={stock.name}
      >
        <span className="text-slate-900 text-sm font-medium truncate block">{stock.name}</span>
        <span className="text-slate-500 text-xs">({stock.ticker})</span>
      </div>

     

      {/* Spacer */}
      <div className="flex-1 min-w-[8px]" />

      {/* Metrics - flex-wrap to prevent overflow */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <div className="flex flex-col items-end">
          <span className="text-xs text-slate-500">Close</span>
          <span className="font-semibold text-slate-800">
            {stock.close.toFixed(2)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-slate-500">Starter T-1</span>
          <span className="font-medium text-amber-600">
            {stock.starter_yesterday_pct.toFixed(2)}%
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-slate-500">Starter T0</span>
          <span className="font-medium text-emerald-600">
            {stock.starter_today_pct.toFixed(2)}%
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-slate-500">Opór 20d</span>
          <span className="text-slate-700">
            {stock.opor_20d != null ? stock.opor_20d.toFixed(2) : "—"}
          </span>
        </div>
        <div className="flex flex-col items-end pl-3 border-l border-slate-300">
          <span className="text-xs text-slate-500">Stop 3d</span>
          <span className="text-slate-700">
            {stock.ciasny_stop_3d != null ? stock.ciasny_stop_3d.toFixed(2) : "—"}
          </span>
        </div>
      </div>

      {/* Chart link button */}
      <Link
        to={`/scenarios/gmma-squeeze/chart/${stock.ticker}`}
        className="
          flex-shrink-0 ml-2
          flex items-center gap-1.5
          px-3 py-1.5 rounded-md
          bg-indigo-50 text-indigo-700
          hover:bg-indigo-100 transition
          text-xs font-medium
          border border-indigo-200
        "
        title="View GMMA Chart"
      >
        <BarChart3 size={14} />
        Chart
      </Link>
    </div>
  );
};

export const GmmaSqueezeOutput = ({
  results,
}: {
  results: IGmmaSqueezeResultItem[];
}) => {
  if (results.length === 0) return null;

  return (
    <DefaultScanResultList title={`GMMA Squeeze Signals (${results.length})`}>
      {results.map((stock) => (
        <ResultRow key={stock.ticker} stock={stock} />
      ))}
    </DefaultScanResultList>
  );
};
