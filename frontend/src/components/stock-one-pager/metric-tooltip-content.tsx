import React from "react";

interface MetricTooltipContentProps {
  value: string | number;
  description: string;
  definition: string; // Or formula
  criterion?: string; // Or threshold
  valueColorClass?: string;
  labels?: {
    value?: string;
    description?: string;
    definition?: string;
    criterion?: string;
  };
}

export const MetricTooltipContent: React.FC<MetricTooltipContentProps> = ({
  value,
  description,
  definition,
  criterion,
  valueColorClass = "text-emerald-600",
  labels = {},
}) => {
  const {
    value: labelValue = "Value",
    description: labelDescription = "Description",
    definition: labelDefinition = "Definition",
    criterion: labelCriterion = "Criterion",
  } = labels;

  return (
    <div className="space-y-3 text-left">
      <div>
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
          {labelValue}
        </h4>
        <p className={`font-mono font-semibold ${valueColorClass}`}>{value}</p>
      </div>
      <div>
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
          {labelDescription}
        </h4>
        <p className="text-slate-600 text-xs leading-snug">{description}</p>
      </div>
      <div className="border-t border-slate-100 pt-2">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
          {labelDefinition}
        </h4>
        <p className="text-slate-500 text-xs italic">{definition}</p>
      </div>
      {criterion && (
        <div className="border-t border-slate-100 pt-2">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            {labelCriterion}
          </h4>
          <p className="text-slate-600 text-xs">{criterion}</p>
        </div>
      )}
    </div>
  );
};
