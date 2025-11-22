import type { ReactNode } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import clsx from "clsx"

export type MetricStatus = "good" | "neutral" | "bad"

interface MetricsItem {
  label: string
  value: string
  icon: ReactNode
  tooltip: string
  status?: MetricStatus
  meets?: boolean
}

interface MetricsCardProps {
  title: string
  titleIcon?: ReactNode
  metrics: MetricsItem[]
}

/**
 * A generic card for displaying key-value metrics with an icon and tooltip.
 */
export const MetricsCard = ({ title, titleIcon, metrics }: MetricsCardProps) => {
  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
          {titleIcon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {metrics.map(({ label, value, icon, tooltip, status, meets }) => (
          <TooltipProvider key={label}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={clsx("flex items-start gap-3 p-3 rounded-lg border hover:shadow-sm transition", {
                    "bg-green-50 border-green-200": status === "good",
                    "bg-amber-50 border-amber-200": status === "neutral",
                    "bg-red-50 border-red-200": status === "bad",
                    "bg-gray-50 border-gray-200": !status,
                  })}
                >
                  <div
                    className={clsx("h-10 w-10 p-1.5 rounded-md", {
                      "text-green-600 bg-green-100": status === "good",
                      "text-amber-600 bg-amber-100": status === "neutral",
                      "text-red-600 bg-red-100": status === "bad",
                      "text-primary bg-primary/10": !status,
                    })}
                  >
                    {icon}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-gray-600 font-medium leading-snug">{label}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-gray-900 tabular-nums text-left">{value}</p>
                      {typeof meets === "boolean" && (
                        <span
                          className={clsx(
                            "px-2 py-0.5 rounded-full text-xs font-semibold",
                            meets ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          )}
                        >
                          {meets ? "OK" : "Watch"}
                        </span>
                      )}
                    </div>
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
  )
}
