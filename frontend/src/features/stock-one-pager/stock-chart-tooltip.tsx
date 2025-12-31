import React from "react";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/formatting";

export const StockChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const dateStr = label ? format(new Date(label), "MMM d, yyyy") : "";

  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-lg p-3 min-w-[180px]">
      <p className="text-sm font-semibold text-slate-900 mb-2 pb-2 border-b border-slate-100">
        {dateStr}
      </p>
      <div className="flex flex-col gap-1.5">
        {payload.map((entry: any, index: number) => {
          // Skip rendering if value is null/undefined
          if (entry.value === undefined || entry.value === null) return null;

          // Determine label and color based on dataKey or name
          let labelText = entry.name;
          let valueColor = "text-slate-700";
          let valueText = "";

          if (typeof entry.value === 'number') {
             valueText = formatCurrency({ value: entry.value });
          } else {
             valueText = entry.value;
          }

          // Customize based on dataKey
          if (entry.dataKey === "price") {
            labelText = "Price";
            valueColor = "text-blue-700";
          } else if (entry.dataKey === "sma_short") {
            labelText = entry.name; // e.g., "SMA 50"
            valueColor = "text-teal-700";
          } else if (entry.dataKey === "sma_long") {
            labelText = entry.name; // e.g., "SMA 200"
            valueColor = "text-orange-700";
          } else if (entry.dataKey === "bullish") {
            labelText = "Golden Cross";
            valueColor = "text-yellow-600";
          } else if (entry.dataKey === "bearish") {
            labelText = "Death Cross";
            valueColor = "text-slate-700";
          }

          return (
            <div key={index} className="flex justify-between items-center gap-4 text-xs">
              <span className="flex items-center gap-2 text-slate-500 font-medium">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color || entry.payload.fill }}
                />
                {labelText}
              </span>
              <span className={`font-mono font-semibold ${valueColor}`}>
                {valueText}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
