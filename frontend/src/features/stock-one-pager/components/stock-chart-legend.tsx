import React from 'react';

export const StockChartLegend = (props: any) => {
  const { payload } = props;

  return (
    <div className="flex flex-wrap gap-2 justify-center mb-4">
      {payload.map((entry: any, index: number) => {
        let chipClass = "bg-gray-100 text-gray-700 border-gray-200"; // Default
        const label = entry.value;

        if (entry.dataKey === "price") {
          chipClass = "bg-blue-50 text-blue-700 border-blue-200";
        } else if (entry.dataKey === "sma_short") {
          chipClass = "bg-teal-50 text-teal-700 border-teal-200";
        } else if (entry.dataKey === "sma_long") {
          chipClass = "bg-orange-50 text-orange-700 border-orange-200";
        } else if (entry.value === "Golden Cross") {
          chipClass = "bg-yellow-50 text-yellow-700 border-yellow-200";
        } else if (entry.value === "Death Cross") {
          chipClass = "bg-slate-100 text-slate-700 border-slate-200";
        }

        return (
          <div
            key={`legend-item-${index}`}
            className={`flex items-center px-3 py-1 rounded-full text-xs font-medium border ${chipClass}`}
          >
             {entry.value === "Golden Cross" ? (
                 <div className="w-2 h-2 rounded-full mr-2 bg-[#FFD700] border border-black" />
             ) : entry.value === "Death Cross" ? (
                 <div className="w-2 h-2 rounded-full mr-2 bg-black border border-white" />
             ) : (
               <div
                  className="w-3 h-0.5 mr-2"
                  style={{ backgroundColor: entry.color }}
               />
             )}
            {label}
          </div>
        );
      })}
    </div>
  );
};
