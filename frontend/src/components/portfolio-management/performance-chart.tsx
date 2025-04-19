"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { TrendingUp } from "lucide-react"

// Sample performance data
const performanceData = {
    "1M": [
        { date: "Apr 01", portfolio: 10000, benchmark: 10000 },
        { date: "Apr 05", portfolio: 10200, benchmark: 10150 },
        { date: "Apr 10", portfolio: 10150, benchmark: 10100 },
        { date: "Apr 15", portfolio: 10300, benchmark: 10200 },
        { date: "Apr 20", portfolio: 10450, benchmark: 10250 },
        { date: "Apr 25", portfolio: 10400, benchmark: 10300 },
        { date: "Apr 30", portfolio: 10550, benchmark: 10350 },
    ],
    "3M": [
        { date: "Feb 01", portfolio: 9500, benchmark: 9600 },
        { date: "Feb 15", portfolio: 9700, benchmark: 9700 },
        { date: "Mar 01", portfolio: 9800, benchmark: 9750 },
        { date: "Mar 15", portfolio: 10000, benchmark: 9900 },
        { date: "Apr 01", portfolio: 10200, benchmark: 10000 },
        { date: "Apr 15", portfolio: 10400, benchmark: 10200 },
        { date: "Apr 30", portfolio: 10550, benchmark: 10350 },
    ],
    "1Y": [
        { date: "May 2022", portfolio: 8500, benchmark: 9000 },
        { date: "Jul 2022", portfolio: 8200, benchmark: 8700 },
        { date: "Sep 2022", portfolio: 8000, benchmark: 8500 },
        { date: "Nov 2022", portfolio: 8800, benchmark: 9000 },
        { date: "Jan 2023", portfolio: 9200, benchmark: 9300 },
        { date: "Mar 2023", portfolio: 10000, benchmark: 9800 },
        { date: "Apr 2023", portfolio: 10550, benchmark: 10350 },
    ],
    All: [
        { date: "Jan 2021", portfolio: 5000, benchmark: 5000 },
        { date: "Jul 2021", portfolio: 6000, benchmark: 5800 },
        { date: "Jan 2022", portfolio: 7500, benchmark: 7000 },
        { date: "Jul 2022", portfolio: 8200, benchmark: 8700 },
        { date: "Jan 2023", portfolio: 9200, benchmark: 9300 },
        { date: "Apr 2023", portfolio: 10550, benchmark: 10350 },
    ],
}

type TimeRange = "1M" | "3M" | "1Y" | "All"

export default function PerformanceChart() {
    const [timeRange, setTimeRange] = useState<TimeRange>("1M")

    const data = performanceData[timeRange]

    const initialValue = data[0].portfolio
    const currentValue = data[data.length - 1].portfolio
    const percentChange = ((currentValue - initialValue) / initialValue) * 100

    const benchmarkInitial = data[0].benchmark
    const benchmarkCurrent = data[data.length - 1].benchmark
    const benchmarkChange = ((benchmarkCurrent - benchmarkInitial) / benchmarkInitial) * 100

    return (
        <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Portfolio Performance
                </CardTitle>
                <div className="flex space-x-2">
                    {(["1M", "3M", "1Y", "All"] as TimeRange[]).map((range) => (
                        <Button
                            key={range}
                            variant={timeRange === range ? "default" : "outline"}
                            size="sm"
                            className={timeRange === range ? "bg-primary text-white" : ""}
                            onClick={() => setTimeRange(range)}
                        >
                            {range}
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between mb-4">
                    <div>
                        <p className="text-sm text-gray-500">Portfolio Value</p>
                        <p className="text-2xl font-bold">${currentValue.toLocaleString()}</p>
                        <p className={`text-sm ${percentChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {percentChange >= 0 ? "+" : ""}
                            {percentChange.toFixed(2)}% {timeRange}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">vs. S&P 500</p>
                        <p className="text-2xl font-bold">${benchmarkCurrent.toLocaleString()}</p>
                        <p className={`text-sm ${benchmarkChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {benchmarkChange >= 0 ? "+" : ""}
                            {benchmarkChange.toFixed(2)}% {timeRange}
                        </p>
                    </div>
                </div>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip
                                formatter={(value) => [`$${value.toLocaleString()}`, undefined]}
                                labelFormatter={(label) => `Date: ${label}`}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="portfolio"
                                name="Your Portfolio"
                                stroke="#0088FE" // Using blue similar to your badge colors
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 8 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="benchmark"
                                name="S&P 500"
                                stroke="#82ca9d" // Using green similar to your status colors
                                strokeWidth={2}
                                dot={false}
                                strokeDasharray="5 5"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
