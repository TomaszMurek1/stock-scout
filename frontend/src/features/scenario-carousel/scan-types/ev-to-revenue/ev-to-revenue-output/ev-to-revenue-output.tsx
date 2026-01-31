import { IEvToRevenueData } from "./ev-to-revenue-output.types";
import { DefaultScanResultList, DefaultScanResultCard } from "../../../shared/default-scan-results";

export const EvToRevenueOutput = ({ data }: { data: IEvToRevenueData[] }) => {
  if (data.length === 0) return null;

  return (
    <DefaultScanResultList>
      {data.map((stock, index) => (
        <DefaultScanResultCard
          key={`${stock.ticker}-${index}`}
          ticker={stock.ticker}
          name={stock.company_name}
          details={
            <span className="font-medium text-slate-700">
              EV/Rev: <span className="font-bold text-blue-700">{stock.ev_to_revenue.toFixed(2)}</span>
            </span>
          }
        />
      ))}
    </DefaultScanResultList>
  );
};
