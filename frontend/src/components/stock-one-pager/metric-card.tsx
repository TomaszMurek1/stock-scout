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
  description?: string
  definition?: string
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
        {metrics.map(({ label, value, icon, tooltip, description, definition, status, meets }) => (
          <TooltipProvider key={label}>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <div
                  className={clsx("flex items-start gap-3 p-3 rounded-lg border hover:shadow-sm transition w-full", {
                    "bg-green-50 border-green-200": status === "good",
                    "bg-amber-50 border-amber-200": status === "neutral",
                    "bg-red-50 border-red-200": status === "bad",
                    "bg-gray-50 border-gray-200": !status,
                  })}
                >
                  <div
                    className={clsx("h-10 w-10 p-1.5 rounded-md shrink-0", {
                      "text-green-600 bg-green-100": status === "good",
                      "text-amber-600 bg-amber-100": status === "neutral",
                      "text-red-600 bg-red-100": status === "bad",
                      "text-primary bg-primary/10": !status,
                    })}
                  >
                    {icon}
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm text-gray-600 font-medium leading-snug break-words text-left">
                      {label}
                    </p>
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-lg font-semibold text-gray-900 tabular-nums text-left truncate">
                        {value}
                      </p>
                      {typeof meets === "boolean" && (
                        <span
                          className={clsx(
                            "hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-semibold",
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
              <TooltipContent className="max-w-[320px] bg-white border border-gray-200 p-4 rounded-lg shadow-xl">
                <div className="space-y-3 break-words">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Wartość
                    </h4>
                    <p className="text-sm font-semibold text-gray-900 tabular-nums break-words">{value}</p>
                  </div>
                  {description && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Co to znaczy?
                      </h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
                    </div>
                  )}
                  {definition && (
                    <div className="pt-2 border-t border-gray-100">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Definicja
                      </h4>
                      <p className="text-sm font-medium text-gray-900">{definition}</p>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Kryterium
                    </h4>
                    <p className="text-sm font-medium text-gray-900">{tooltip}</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </CardContent>
    </Card>
  )
}
