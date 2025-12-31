import { Link } from "react-router-dom";
import { IBreakoutResultItem } from "./breakout-form.types";

export const BreakoutOutput = ({ results }: { results: IBreakoutResultItem[] }) => {
  if (results.length === 0) return null;

  return (
    <div className="mt-8 bg-slate-50 p-6 rounded-lg border border-slate-200 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-slate-800">
        Breakout Candidates
      </h3>
      <div className="flex flex-col space-y-3">
        {results.map((stock) => (
          <Link
            key={stock.ticker}
            to={`/stock-details/${stock.ticker}`}
            className="
              flex items-center
              bg-white p-4
              rounded-lg border border-slate-200
              hover:bg-slate-100 transition cursor-pointer shadow-sm
            "
          >
            {/* Name and Ticker */}
            <div className="w-1/3 min-w-[150px]">
               <div className="font-bold text-slate-900">{stock.ticker}</div>
               <div className="text-sm text-slate-500 truncate" title={stock.name}>{stock.name}</div>
            </div>

            {/* Breakout Details */}
            <div className="flex-1 flex justify-between items-center text-sm px-4">
               <div className="flex flex-col">
                  <span className="text-xs text-slate-500">Current Price</span>
                  <span className="font-semibold text-slate-800">${stock.current_price.toFixed(2)}</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-xs text-slate-500">Range (H/L)</span>
                  <span>${stock.range_high.toFixed(2)} / ${stock.range_low.toFixed(2)}</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-xs text-slate-500">Range %</span>
                  <span className="font-medium text-blue-600">
                    {stock.range_pct.toFixed(2)}%
                  </span>
               </div>
            </div>

            {/* Date */}
            <div className="text-right pl-4 border-l border-slate-100">
              <div className="text-xs text-slate-500">Date</div>
              <div className="text-sm text-slate-700">{stock.date}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
