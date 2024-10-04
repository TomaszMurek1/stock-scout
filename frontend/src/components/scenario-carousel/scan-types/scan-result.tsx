import { ScanResultsProps } from "./golden-cross-form/golden-cross-form";

const ScanResults = ({ data }: IData[]) => {
  if (results?.length === 0) return null;
  console.log("types", results);

  return (
    <div className="mt-8 bg-slate-100 p-4 rounded-lg border border-slate-200">
      <h3 className="text-lg font-semibold mb-3 text-slate-800">
        Scan Results
      </h3>
      <ul className="list-disc pl-5 space-y-2 text-slate-700">
        {results?.map((stock, index) => (
          <li key={index}>{stock.data.ticker}</li>
        ))}
      </ul>
    </div>
  );
};

export default ScanResults;
