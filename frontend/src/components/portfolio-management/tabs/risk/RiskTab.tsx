"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChartIcon, BarChart3 } from "lucide-react"

const sectorData = [
    { name: "Technology", value: 45 },
    { name: "Healthcare", value: 15 },
    { name: "Consumer Cyclical", value: 12 },
    { name: "Financial Services", value: 10 },
    { name: "Communication Services", value: 8 },
    { name: "Industrials", value: 5 },
    { name: "Other", value: 5 },
]

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#BDBDBD"]

export default function RiskAnalysis() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5 text-primary" />
                        Sector Allocation
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sectorData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {sectorData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `${value}%`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Risk Metrics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium">Portfolio Beta</span>
                                <span className="text-sm font-medium">1.15</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: "75%" }}></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Your portfolio is slightly more volatile than the market</p>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium">Maximum Drawdown</span>
                                <span className="text-sm font-medium text-red-600">-28.5%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-red-600 h-2 rounded-full" style={{ width: "28.5%" }}></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Maximum observed loss from a peak to a trough</p>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium">Sharpe Ratio</span>
                                <span className="text-sm font-medium">1.8</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-green-600 h-2 rounded-full" style={{ width: "60%" }}></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Good risk-adjusted return (higher is better)</p>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium">Diversification Score</span>
                                <span className="text-sm font-medium">65/100</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: "65%" }}></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Consider adding more asset classes to improve diversification
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>Risk Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <h3 className="font-medium text-blue-800">Technology Overweight</h3>
                            <p className="text-sm text-blue-600 mt-1">
                                Your portfolio has 45% allocation to Technology, which is significantly higher than the S&P 500 weight
                                of 28%. Consider diversifying into other sectors.
                            </p>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-lg">
                            <h3 className="font-medium text-amber-800">Volatility Alert</h3>
                            <p className="text-sm text-amber-600 mt-1">
                                Your portfolio beta of 1.15 indicates higher volatility than the market. This may lead to larger swings
                                in portfolio value during market fluctuations.
                            </p>
                        </div>

                        <div className="p-4 bg-green-50 rounded-lg">
                            <h3 className="font-medium text-green-800">Diversification Opportunity</h3>
                            <p className="text-sm text-green-600 mt-1">
                                Adding exposure to bonds or other fixed income securities could improve your portfolio's risk-adjusted
                                returns and reduce overall volatility.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
