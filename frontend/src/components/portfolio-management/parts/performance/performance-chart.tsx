"use client"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts"
import { TrendingUp } from "lucide-react"

export type TimeRange = "1M" | "3M" | "1Y" | "All"

interface Props {
    data: { date: string; value: number }[]
    timeRange: TimeRange
    onTimeRangeChange: (range: TimeRange) => void
}

export default function PerformanceChart({
    data,
    timeRange,
    onTimeRangeChange,
}: Props) {
    if (data.length === 0) {
        return <div className="py-10 text-center text-gray-500">No data</div>
    }

    const initial = data[0].value
    const current = data[data.length - 1].value
    const change = ((current - initial) / initial) * 100

    return (
        <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex justify-between pb-2">
                <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Portfolio Performance
                </CardTitle>
                <div className="flex space-x-2">
                    {(["1M", "3M", "1Y", "All"] as TimeRange[]).map((r) => (
                        <Button
                            key={r}
                            variant={timeRange === r ? "default" : "outline"}
                            size="sm"
                            className={timeRange === r ? "bg-primary text-white" : ""}
                            onClick={() => onTimeRangeChange(r)}
                        >
                            {r}
                        </Button>
                    ))}
                </div>
            </CardHeader>

            <CardContent>
                <div className="flex justify-between mb-4">
                    <div>
                        <p className="text-sm text-gray-500">Portfolio Value</p>
                        <p className="text-2xl font-bold">${current.toLocaleString()}</p>
                        <p
                            className={`text-sm ${change >= 0 ? "text-green-600" : "text-red-600"
                                }`}
                        >
                            {change >= 0 ? "+" : ""}
                            {change.toFixed(2)}% {timeRange}
                        </p>
                    </div>
                </div>

                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip
                                formatter={(val) => [`$${val.toLocaleString()}`, "Value"]}
                                labelFormatter={(lbl) => `Date: ${lbl}`}
                            />
                            <Line
                                type="monotone"
                                dataKey="value"
                                name="Your Portfolio"
                                stroke="#0088FE"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 8 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
