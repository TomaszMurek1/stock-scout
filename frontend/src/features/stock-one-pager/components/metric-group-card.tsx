import React from "react";
import { Tooltip } from "@/components/ui/Layout";
import { MetricTooltipContent } from "./metric-tooltip-content";
import { RefreshedCard, RefreshedHeader } from "./refreshed-card";

export const MetricGroupCard = ({
  title,
  titleIcon,
  metrics,
  isRefreshed = false,
}: {
  title: string;
  titleIcon: React.ReactNode;
  metrics: any[];
  isRefreshed?: boolean;
}) => (
  <RefreshedCard isRefreshed={isRefreshed} className="mb-6 shadow-sm border-slate-200">
    <RefreshedHeader isRefreshed={isRefreshed} className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 rounded-t-lg bg-slate-50/50">
      <span className="text-slate-600">{titleIcon}</span>
      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">{title}</h3>
    </RefreshedHeader>
    <div className="p-2">
      {metrics.map((metric, idx) => (
        <div
          key={idx}
          className="group flex items-center justify-between p-2.5 rounded hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
              {metric.icon}
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-slate-700">{metric.label}</span>
                <Tooltip
                  content={
                    <MetricTooltipContent
                      value={metric.value}
                      description={metric.description}
                      definition={metric.definition}
                      criterion={metric.criterion}
                      labels={{ definition: "Formula", criterion: "Threshold" }}
                    />
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-slate-300 hover:text-blue-500 cursor-help"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </Tooltip>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`text-sm font-bold ${
                metric.status === "success"
                  ? "text-emerald-600"
                  : metric.status === "danger"
                    ? "text-rose-600"
                    : metric.status === "warning"
                      ? "text-amber-600"
                      : "text-slate-900"
              }`}
            >
              {metric.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  </RefreshedCard>
);
