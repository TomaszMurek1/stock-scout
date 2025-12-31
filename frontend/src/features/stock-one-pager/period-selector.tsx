import { FC } from "react";

export type Period = "1M" | "1Q" | "YTD" | "1Y" | "All";

interface PeriodSelectorProps {
  selectedPeriod: Period;
  onSelect: (period: Period) => void;
}

export const PeriodSelector: FC<PeriodSelectorProps> = ({ selectedPeriod, onSelect }) => {
  const periods: Period[] = ["1M", "1Q", "YTD", "1Y", "All"];

  return (
    <div className="flex p-1 bg-slate-100 rounded-lg">
      {periods.map((p) => (
        <button
          key={p}
          onClick={() => onSelect(p)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
            selectedPeriod === p
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
};
