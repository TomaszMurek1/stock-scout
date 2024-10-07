import { IData } from "./golden-cross-form/golden-cross-form.types";

const ScanResults = ({ results }: { results: IData[] }) => {
  if (results.length === 0) return null;

  // Sort results by date from newest to oldest
  const sortedResults = [...results].sort(
    (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
  );

  return (
    <div className="mt-8 bg-slate-100 p-4 rounded-lg border border-slate-200">
      <h3 className="text-lg font-semibold mb-3 text-slate-800">
        Scan Results
      </h3>
      <ul className="list-disc pl-5 space-y-2 text-slate-700">
        {sortedResults.map((stock, index) => (
          <li key={index}>
            {stock.data.ticker} - {stock.data.name} (Date: {stock.data.date})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ScanResults;
