import { Link } from "react-router-dom";
import { IData } from "./death-cross-page.types";

export const DeathCrossOutput = ({ results }: { results: IData[] }) => {
  if (results.length === 0) return null;

  const sortedResults = [...results].sort(
    (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
  );

  return (
    <div className="mt-8 bg-slate-100 p-6 rounded-lg border border-slate-200 shadow">
      <h3 className="text-lg font-semibold mb-4 text-slate-800">
        Scan Results
      </h3>
      <div className="flex flex-col space-y-3">
        {sortedResults.map((stock) => (
          <Link
            key={stock.ticker}
            to={
              `/stock-details/${stock.ticker}`
              + `?short_window=${stock.data.short_ma}`
              + `&long_window=${stock.data.long_ma}`
            }
            className="
              flex items-center
              bg-white p-4
              rounded-lg border border-slate-300
              hover:bg-slate-200 transition cursor-pointer shadow-sm
            "
          >
            {/* Name box: never shrinks/grows, truncated with tooltip */}
            <div
              className="flex-shrink-0 w-64 text-left truncate overflow-hidden whitespace-nowrap"
              title={stock.data.name}
            >
              {stock.data.name}
            </div>

            <div className="flex-1"></div>

            <div className="flex items-center text-sm text-slate-600 space-x-4">
              <span className="font-semibold text-red-700">
                <strong>Date:</strong> {stock.data.date}
              </span>
              <span>
                SMA {stock.data.short_ma}/{stock.data.long_ma}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
