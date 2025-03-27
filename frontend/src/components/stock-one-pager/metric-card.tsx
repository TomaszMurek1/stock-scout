// src/components/StockOnePager/MetricsCard.tsx

import { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import clsx from "clsx";

export type MetricStatus = "good" | "neutral" | "bad";

interface MetricsItem {
  label: string;
  value: string;
  icon: ReactNode;
  tooltip: string;
  status?: MetricStatus;
}

interface MetricsCardProps {
  title: string;
  metrics: MetricsItem[];
}

/**
 * A generic card for displaying key-value metrics with an icon and tooltip.
 */
export const MetricsCard = ({ title, metrics }: MetricsCardProps) => {
  return (
    <Card className="border border-gray-200 shadow-md bg-white">
      <CardHeader className="pb-2 border-b">
        <CardTitle className="text-xl text-gray-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map(({ label, value, icon, tooltip, status }) => (
          <TooltipProvider key={label}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={clsx(
                    "flex items-center gap-4 p-4 rounded-lg border hover:shadow transition",
                    {
                      "bg-green-50 border-green-200": status === "good",
                      "bg-yellow-50 border-yellow-200": status === "neutral",
                      "bg-red-50 border-red-200": status === "bad",
                      "bg-gray-50 border-gray-100": !status,
                    }
                  )}
                >
                  <div
                    className={clsx("h-8 w-8", {
                      "text-green-600": status === "good",
                      "text-yellow-600": status === "neutral",
                      "text-red-600": status === "bad",
                      "text-blue-600": !status,
                    })}
                  >
                    {icon}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">{label}</p>
                    <p className="text-2xl font-semibold text-gray-900">{value}</p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[240px] text-sm text-gray-700 bg-white border border-gray-200 p-2 rounded shadow-md">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </CardContent>
    </Card>
  );
};