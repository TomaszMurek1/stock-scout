import { Link } from "react-router-dom";

export interface IChochData {
  ticker: string;
  name: string;
  price: number;
  broken_level: number;
  level_date: string;
  date: string;
}

export const ChochOutput = ({ results }: { results: IChochData[] }) => {
  if (results.length === 0) return null;

  return (
    <div className="mt-8 bg-slate-100 p-6 rounded-lg border border-slate-200 shadow">
      <h3 className="text-lg font-semibold mb-4 text-slate-800">
        Scan Results (Bearish to Bullish CHoCH)
      </h3>
      <div className="flex flex-col space-y-3">
        {results.map((stock) => (
          <Link
            key={stock.ticker}
            to={`/stock-details/${stock.ticker}`}
            className="
              flex items-center
              bg-white p-4
              rounded-lg border border-slate-300
              hover:bg-slate-200 transition cursor-pointer shadow-sm
            "
          >
            <div className="flex-1">
              <div className="font-bold text-lg">{stock.ticker}</div>
              <div className="text-sm text-gray-500" title={stock.name}>
                {stock.name}
              </div>
            </div>

            <div className="flex flex-col items-end text-sm text-slate-600 space-y-1 text-right">
              <div className="font-semibold text-green-700">
                 Breakout: +{(stock.price - stock.broken_level).toFixed(2)} ({((stock.price - stock.broken_level) / stock.broken_level * 100).toFixed(2)}%)
              </div>
              <div className="text-slate-500">
                Current: <strong>{stock.price.toFixed(2)}</strong> broke above LH: <strong>{stock.broken_level.toFixed(2)}</strong>
              </div>
              <div className="text-xs text-gray-400">
                Lower High formed on: {stock.level_date}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
