import { Link } from "react-router-dom";
import { IData } from "./golden-cross-page.types";

export const GoldenCrossOutput = ({ results }: { results: IData[] }) => {
  if (results.length === 0) return null;

  // Sort results by date from newest to oldest
  const sortedResults = [...results].sort(
    (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
  );
  return (
    <div className="mt-8 bg-slate-100 p-6 rounded-lg border border-slate-200 shadow">
      <h3 className="text-lg font-semibold mb-4 text-slate-800">Scan Results</h3>
      <div className="flex flex-col space-y-3">
        {sortedResults.map((stock) => (
          <Link
            key={stock.ticker}
            to={`/stock-details/${stock.ticker}`} // Internal navigation
            className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-300 hover:bg-slate-200 transition cursor-pointer shadow-sm"
          >
            <div className="text-lg font-semibold text-slate-800">{stock.ticker}</div>
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-green-700">
                Date: {stock.data.date}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );

};


