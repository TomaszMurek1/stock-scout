import { IBreakoutResultItem } from "./breakout-form.types";
import { DefaultScanResultList, DefaultScanResultCard } from "../../shared/default-scan-results";

export const BreakoutOutput = ({ results }: { results: IBreakoutResultItem[] }) => {
  if (results.length === 0) return null;

  return (
    <DefaultScanResultList title="Breakout Candidates">
      {results.map((stock) => (
        <DefaultScanResultCard
          key={stock.ticker}
          ticker={stock.ticker}
          name={stock.name}
          details={
            <>
              <div className="flex flex-col items-end">
                <span className="text-xs text-slate-500">Current Price</span>
                <span className="font-semibold text-slate-800">${stock.current_price.toFixed(2)}</span>
              </div>
              <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs text-slate-500">Range (H/L)</span>
                  <span>${stock.range_high.toFixed(2)} / ${stock.range_low.toFixed(2)}</span>
              </div>
              <div className="flex flex-col items-end">
                  <span className="text-xs text-slate-500">Range %</span>
                  <span className="font-medium text-blue-600">{stock.range_pct.toFixed(2)}%</span>
              </div>
              <div className="hidden md:flex flex-col items-end pl-4 border-l border-slate-300">
                <span className="text-xs text-slate-500">Date</span>
                <span className="text-slate-700">{stock.date}</span>
              </div>
            </>
          }
        />
      ))}
    </DefaultScanResultList>
  );
};
