import { ICrossScanData } from "./cross-scan.types";
import { DefaultScanResultList, DefaultScanResultCard } from "../../shared/default-scan-results";

interface CrossScanOutputProps {
  results: ICrossScanData[];
  /** CSS color class for the date label, e.g. "text-green-700" or "text-red-700" */
  dateColorClass: string;
}

export const CrossScanOutput = ({ results, dateColorClass }: CrossScanOutputProps) => {
  if (results.length === 0) return null;

  const sortedResults = [...results].sort(
    (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
  );

  return (
    <DefaultScanResultList>
      {sortedResults.map((stock) => (
        <DefaultScanResultCard
          key={stock.ticker}
          ticker={stock.ticker}
          name={stock.data.name}
          queryParams={`?short_window=${stock.data.short_ma}&long_window=${stock.data.long_ma}`}
          details={
            <>
              <span className={`font-semibold ${dateColorClass}`}>
                <strong>Date:</strong> {stock.data.date}
              </span>
              <span>
                SMA {stock.data.short_ma}/{stock.data.long_ma}
              </span>
            </>
          }
        />
      ))}
    </DefaultScanResultList>
  );
};
