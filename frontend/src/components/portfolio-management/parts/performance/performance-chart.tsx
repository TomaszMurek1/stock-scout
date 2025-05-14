
import { useMemo, useEffect } from "react"
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

export type TimeRange = "1M" | "3M" | "6M" | "1Y" | "All"

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

    // Compute summary stats
    const initial = data[0].value
    const current = data[data.length - 1].value
    const change = ((current - initial) / initial) * 100

    // Convert date strings to numeric timestamps for axis
    const chartData = useMemo(
        () =>
            data.map((d) => ({ dateValue: new Date(d.date).getTime(), value: d.value })),
        [data]
    )

    // Log chart domain values
    useEffect(() => {
        const dates = chartData.map((d) => d.dateValue)
        const dataMin = Math.min(...dates)
        const dataMax = Math.max(...dates)
        console.log(`PerformanceChart: timeRange= ${timeRange}`, { dataMin, dataMax, chartData })
    }, [chartData, timeRange])


    return (
        // Key on Card forces full remount when timeRange changes
        <Card key={timeRange} className="border-gray-200 shadow-sm">
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
                        <p className="text-2xl font-bold">
                            ${current.toLocaleString()}
                        </p>
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
                            data={chartData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="dateValue"
                                type="number"
                                domain={["dataMin", "dataMax"]}
                                tickFormatter={(ts) => new Date(ts).toLocaleDateString()}
                            />
                            <YAxis domain={["auto", "auto"]} />
                            <Tooltip
                                formatter={(val) => [`$${val.toLocaleString()}`, "Value"]}
                                labelFormatter={(ts) =>
                                    `Date: ${new Date(ts).toLocaleDateString()}`
                                }
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
