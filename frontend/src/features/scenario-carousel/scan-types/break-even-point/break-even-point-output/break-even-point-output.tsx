import { IBreakEvenPointData } from "./break-even-point-output.types";
import { formatCurrency } from "@/utils/formatting";
import { DefaultScanResultList, DefaultScanResultCard } from "../../../shared/default-scan-results";

export const BreakEvenPointOutput = ({ data }: { data: IBreakEvenPointData[] }) => {
  if (data.length === 0) return null;
  return (
    <DefaultScanResultList>
      {data.map((stock) => (
        <DefaultScanResultCard
          key={stock.ticker}
          ticker={stock.ticker}
          name={stock.company_name}
          details={
            <div className="text-sm text-slate-600">
              Last Quarter Net Profit:{" "}
              <span className="font-semibold text-green-700">
                {formatCurrency({
                  value: stock.current_net_income,
                  currency: stock.currency,
                  notation: "compact",
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          }
        />
      ))}
    </DefaultScanResultList>
  );
};
