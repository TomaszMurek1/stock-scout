"use client"

import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ScaleIcon,
  ShieldExclamationIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  BanknotesIcon,
  ChartPieIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  TagIcon,
} from "@heroicons/react/24/outline"
import { HeartIcon } from "@heroicons/react/24/solid"

import type { StockData } from "./stock-one-pager.types"
import StockChart from "./stock-chart"
import { MetricsCard } from "./metric-card"
import { getMetricStatus } from "./metric-utils"

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api"

function formatPercentage(value: number | null) {
  return value !== null ? `${(value * 100).toFixed(2)}%` : "N/A"
}

function formatCurrency(value: number | null, currency = "PLN") {
  if (value === null) return "N/A"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number | null, decimals = 2) {
  if (value === null) return "N/A"
  return value.toLocaleString("en-US", { maximumFractionDigits: decimals })
}

export const StockOnePager = () => {
  const { ticker } = useParams()
  const [stock, setStock] = useState<StockData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLogoAvailable, setIsLogoAvailable] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`${API_URL}/stock-details/${ticker}`)
        if (!response.ok) {
          const errBody = await response.json()
          throw new Error(errBody.detail || "Failed to fetch stock details.")
        }

        const data: StockData = await response.json()
        setStock(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [ticker])

  const getChartData = () => {
    if (!stock) return []
    const { stock_prices, sma_50, sma_200 } = stock.technical_analysis

    return stock_prices.map((price) => {
      const sma50Entry = sma_50.find((s) => s.date === price.date)
      const sma200Entry = sma_200.find((s) => s.date === price.date)

      return {
        date: price.date,
        price: price.close,
        sma50: sma50Entry?.SMA_50 ?? null,
        sma200: sma200Entry?.SMA_200 ?? null,
      }
    })
  }

  const getLatestPrice = () => {
    if (!stock) return null
    const prices = stock.technical_analysis.stock_prices
    return prices[prices.length - 1].close
  }

  const getPriceChange = () => {
    if (!stock) return { value: 0, percentage: 0 }
    const prices = stock.technical_analysis.stock_prices
    if (prices.length < 2) return { value: 0, percentage: 0 }

    const latest = prices[prices.length - 1].close
    const previous = prices[prices.length - 2].close
    const change = latest - previous
    const percentage = (change / previous) * 100

    return { value: change, percentage }
  }

  const getFinancialTrend = (dataKey: "revenue" | "net_income" | "ebitda" | "free_cash_flow") => {
    if (!stock) return []
    return stock.financial_trends[dataKey].map((item) => ({
      year: item.year,
      value: item.value,
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="mt-6 text-gray-600 font-medium text-lg">Loading stock details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center text-red-500 p-8 bg-red-50 rounded-xl border border-red-200 max-w-md">
          <ShieldExclamationIcon className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Error Loading Data</h2>
          <p className="text-red-700">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!stock) return null

  const {
    executive_summary,
    company_overview,
    financial_performance,
    investor_metrics,
    valuation_metrics,
    risk_metrics,
    financial_trends,
  } = stock

  const chartData = getChartData()
  const logoUrl = `https://financialmodelingprep.com/image-stock/${ticker}.png`
  const latestPrice = getLatestPrice()
  const priceChange = getPriceChange()

  // Calculate 52-week range
  const prices = stock.technical_analysis.stock_prices.map((p) => p.close)
  const min52Week = Math.min(...prices)
  const max52Week = Math.max(...prices)
  const currentInRange = ((latestPrice! - min52Week) / (max52Week - min52Week)) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="mb-6 p-6 rounded-xl bg-white shadow-md border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              {isLogoAvailable && (
                <div className="flex-shrink-0 hidden md:block">
                  <img
                    src={logoUrl || "/placeholder.svg"}
                    alt={`${executive_summary?.name} logo`}
                    className="w-20 h-20 object-contain bg-gray-100 rounded-lg p-2"
                    onError={() => setIsLogoAvailable(false)}
                  />
                </div>
              )}
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{executive_summary?.name}</h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={isFavorite ? "text-red-500" : "text-gray-400"}
                    onClick={() => setIsFavorite(!isFavorite)}
                  >
                    <HeartIcon className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="outline" className="font-medium text-gray-700">
                    {executive_summary?.ticker}
                  </Badge>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                    {company_overview?.sector}
                  </Badge>
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                    {company_overview?.industry}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-6 mt-3 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <GlobeAltIcon className="h-4 w-4" />
                    <a
                      href={company_overview?.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary"
                    >
                      {company_overview?.website?.replace("https://", "")}
                    </a>
                  </div>
                  <div className="flex items-center gap-1">
                    <BuildingOfficeIcon className="h-4 w-4" />
                    <span>{company_overview?.country}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-3xl md:text-4xl font-bold text-gray-900">
                {formatCurrency(latestPrice, executive_summary?.currency)}
              </div>
              <div
                className={`flex items-center gap-1 text-lg ${priceChange.value >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {priceChange.value >= 0 ? (
                  <ArrowTrendingUpIcon className="h-5 w-5" />
                ) : (
                  <ArrowTrendingDownIcon className="h-5 w-5" />
                )}
                <span>{formatCurrency(priceChange.value, executive_summary?.currency)}</span>
                <span>({priceChange.percentage.toFixed(2)}%)</span>
              </div>
              <div className="mt-3 w-full max-w-[200px]">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{formatCurrency(min52Week, executive_summary?.currency)}</span>
                  <span>52W Range</span>
                  <span>{formatCurrency(max52Week, executive_summary?.currency)}</span>
                </div>
                <div className="relative h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full bg-gradient-to-r from-blue-500 to-primary rounded-full"
                    style={{ width: `${currentInRange}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Overview */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
                  <InformationCircleIcon className="h-5 w-5 text-primary" />
                  Company Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-gray-700 leading-relaxed">
                  {company_overview?.description || "No description available."}
                </p>
              </CardContent>
            </Card>

            {/* Technical Analysis Chart */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
                    <ChartBarIcon className="h-5 w-5 text-primary" />
                    Price Chart
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      SMA 50
                    </Badge>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      SMA 200
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <StockChart historicalData={chartData} />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between text-sm text-gray-500 border-t pt-4">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  <span>1 Year Historical Data</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Volatility:</span>
                    <span>{formatPercentage(risk_metrics.annual_volatility)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Max Drawdown:</span>
                    <span>{formatPercentage(risk_metrics.max_drawdown)}</span>
                  </div>
                </div>
              </CardFooter>
            </Card>

            {/* Financial Trends */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
                  <ArrowTrendingUpIcon className="h-5 w-5 text-primary" />
                  Financial Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="revenue">
                  <TabsList className="mb-4">
                    <TabsTrigger value="revenue">Revenue</TabsTrigger>
                    <TabsTrigger value="net_income">Net Income</TabsTrigger>
                    <TabsTrigger value="ebitda">EBITDA</TabsTrigger>
                    <TabsTrigger value="free_cash_flow">Free Cash Flow</TabsTrigger>
                  </TabsList>

                  <TabsContent value="revenue">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Year</TableHead>
                          <TableHead>Revenue ({executive_summary?.currency})</TableHead>
                          <TableHead>YoY Change</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getFinancialTrend("revenue").map((item, index, arr) => {
                          const prevYear = index < arr.length - 1 ? arr[index + 1] : null
                          const yoyChange = prevYear ? ((item.value - prevYear.value) / prevYear.value) * 100 : null

                          return (
                            <TableRow key={item.year}>
                              <TableCell className="font-medium">{item.year}</TableCell>
                              <TableCell>{formatNumber(item.value)}</TableCell>
                              <TableCell>
                                {yoyChange !== null ? (
                                  <span className={yoyChange >= 0 ? "text-green-600" : "text-red-600"}>
                                    {yoyChange >= 0 ? "+" : ""}
                                    {yoyChange.toFixed(2)}%
                                  </span>
                                ) : (
                                  "N/A"
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="net_income">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Year</TableHead>
                          <TableHead>Net Income ({executive_summary?.currency})</TableHead>
                          <TableHead>YoY Change</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getFinancialTrend("net_income").map((item, index, arr) => {
                          const prevYear = index < arr.length - 1 ? arr[index + 1] : null
                          const yoyChange = prevYear ? ((item.value - prevYear.value) / prevYear.value) * 100 : null

                          return (
                            <TableRow key={item.year}>
                              <TableCell className="font-medium">{item.year}</TableCell>
                              <TableCell>{formatNumber(item.value)}</TableCell>
                              <TableCell>
                                {yoyChange !== null ? (
                                  <span className={yoyChange >= 0 ? "text-green-600" : "text-red-600"}>
                                    {yoyChange >= 0 ? "+" : ""}
                                    {yoyChange.toFixed(2)}%
                                  </span>
                                ) : (
                                  "N/A"
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="ebitda">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Year</TableHead>
                          <TableHead>EBITDA ({executive_summary?.currency})</TableHead>
                          <TableHead>YoY Change</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getFinancialTrend("ebitda").map((item, index, arr) => {
                          const prevYear = index < arr.length - 1 ? arr[index + 1] : null
                          const yoyChange = prevYear ? ((item.value - prevYear.value) / prevYear.value) * 100 : null

                          return (
                            <TableRow key={item.year}>
                              <TableCell className="font-medium">{item.year}</TableCell>
                              <TableCell>{formatNumber(item.value)}</TableCell>
                              <TableCell>
                                {yoyChange !== null ? (
                                  <span className={yoyChange >= 0 ? "text-green-600" : "text-red-600"}>
                                    {yoyChange >= 0 ? "+" : ""}
                                    {yoyChange.toFixed(2)}%
                                  </span>
                                ) : (
                                  "N/A"
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="free_cash_flow">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Year</TableHead>
                          <TableHead>Free Cash Flow ({executive_summary?.currency})</TableHead>
                          <TableHead>YoY Change</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getFinancialTrend("free_cash_flow").map((item, index, arr) => {
                          const prevYear = index < arr.length - 1 ? arr[index + 1] : null
                          const yoyChange = prevYear ? ((item.value - prevYear.value) / prevYear.value) * 100 : null

                          return (
                            <TableRow key={item.year}>
                              <TableCell className="font-medium">{item.year}</TableCell>
                              <TableCell>{formatNumber(item.value)}</TableCell>
                              <TableCell>
                                {yoyChange !== null ? (
                                  <span className={yoyChange >= 0 ? "text-green-600" : "text-red-600"}>
                                    {yoyChange >= 0 ? "+" : ""}
                                    {yoyChange.toFixed(2)}%
                                  </span>
                                ) : (
                                  "N/A"
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Key Metrics Summary */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
                  <TagIcon className="h-5 w-5 text-primary" />
                  Key Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">P/E Ratio</p>
                    <p className="text-lg font-semibold">{valuation_metrics.pe_ratio?.toFixed(2) || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">EV/EBITDA</p>
                    <p className="text-lg font-semibold">{valuation_metrics.ev_ebitda?.toFixed(2) || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Revenue Growth</p>
                    <p
                      className={`text-lg font-semibold ${investor_metrics.revenue_growth >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {investor_metrics.revenue_growth.toFixed(2)}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Gross Margin</p>
                    <p className="text-lg font-semibold">{formatPercentage(financial_performance.gross_margin)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Net Margin</p>
                    <p className="text-lg font-semibold">{formatPercentage(financial_performance.net_margin)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Rule of 40</p>
                    <p
                      className={`text-lg font-semibold ${investor_metrics.rule_of_40 >= 40 ? "text-green-600" : "text-amber-600"}`}
                    >
                      {investor_metrics.rule_of_40.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Valuation Metrics */}
            <MetricsCard
              title="Valuation Metrics"
              titleIcon={<ScaleIcon className="h-5 w-5 text-primary" />}
              metrics={[
                {
                  label: "P/E Ratio",
                  value: valuation_metrics.pe_ratio?.toFixed(2) || "N/A",
                  icon: <ScaleIcon className="h-8 w-8" />,
                  tooltip: "Price to Earnings ratio.",
                  status: getMetricStatus("P/E Ratio", valuation_metrics.pe_ratio),
                },
                {
                  label: "EV/EBITDA",
                  value: valuation_metrics.ev_ebitda?.toFixed(2) || "N/A",
                  icon: <CurrencyDollarIcon className="h-8 w-8" />,
                  tooltip: "Enterprise Value / EBITDA.",
                  status: getMetricStatus("EV/EBITDA", valuation_metrics.ev_ebitda),
                },
                {
                  label: "PEG Ratio",
                  value: valuation_metrics.peg_ratio?.toFixed(2) || "N/A",
                  icon: <ArrowTrendingUpIcon className="h-8 w-8" />,
                  tooltip: "P/E ratio adjusted for growth.",
                  status: getMetricStatus("PEG Ratio", valuation_metrics.peg_ratio),
                },
                {
                  label: "Dividend Yield",
                  value:
                    valuation_metrics.dividend_yield !== null
                      ? formatPercentage(valuation_metrics.dividend_yield)
                      : "N/A",
                  icon: <BanknotesIcon className="h-8 w-8" />,
                  tooltip: "Dividends relative to share price.",
                  status: getMetricStatus("Dividend Yield", valuation_metrics.dividend_yield),
                },
              ]}
            />

            {/* Financial Performance */}
            <MetricsCard
              title="Financial Performance"
              titleIcon={<ChartPieIcon className="h-5 w-5 text-primary" />}
              metrics={[
                {
                  label: "Gross Margin",
                  value: formatPercentage(financial_performance.gross_margin),
                  icon: <ChartPieIcon className="h-8 w-8" />,
                  tooltip: "Percentage of revenue remaining after cost of goods sold.",
                  status: getMetricStatus("Gross Margin", financial_performance.gross_margin),
                },
                {
                  label: "Operating Margin",
                  value: formatPercentage(financial_performance.operating_margin),
                  icon: <Cog6ToothIcon className="h-8 w-8" />,
                  tooltip: "Profitability from core operations.",
                  status: getMetricStatus("Operating Margin", financial_performance.operating_margin),
                },
                {
                  label: "Net Margin",
                  value: formatPercentage(financial_performance.net_margin),
                  icon: <BanknotesIcon className="h-8 w-8" />,
                  tooltip: "Net income as a percentage of revenue.",
                  status: getMetricStatus("Net Margin", financial_performance.net_margin),
                },
              ]}
            />

            {/* Investor Metrics */}
            <MetricsCard
              title="Investor Metrics"
              titleIcon={<CurrencyDollarIcon className="h-5 w-5 text-primary" />}
              metrics={[
                {
                  label: "Rule of 40",
                  value: `${investor_metrics.rule_of_40.toFixed(2)}%`,
                  icon: <ScaleIcon className="h-8 w-8" />,
                  tooltip: "Growth + profitability should exceed 40%.",
                  status: getMetricStatus("Rule of 40", investor_metrics.rule_of_40),
                },
                {
                  label: "EBITDA Margin",
                  value: formatPercentage(investor_metrics.ebitda_margin),
                  icon: <CurrencyDollarIcon className="h-8 w-8" />,
                  tooltip: "Earnings before interest & taxes.",
                  status: getMetricStatus("EBITDA Margin", investor_metrics.ebitda_margin),
                },
                {
                  label: "Revenue Growth",
                  value: `${investor_metrics.revenue_growth.toFixed(2)}%`,
                  icon:
                    investor_metrics.revenue_growth >= 0 ? (
                      <ArrowTrendingUpIcon className="h-8 w-8" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-8 w-8" />
                    ),
                  tooltip: "YoY revenue growth.",
                  status: getMetricStatus("Revenue Growth", investor_metrics.revenue_growth / 100),
                },
                {
                  label: "FCF Margin",
                  value: formatPercentage(investor_metrics.fcf_margin),
                  icon: <BanknotesIcon className="h-8 w-8" />,
                  tooltip: "Free cash flow to revenue ratio.",
                  status: getMetricStatus("FCF Margin", investor_metrics.fcf_margin),
                },
              ]}
            />

            {/* Risk Metrics */}
            <MetricsCard
              title="Risk Metrics"
              titleIcon={<ShieldExclamationIcon className="h-5 w-5 text-primary" />}
              metrics={[
                {
                  label: "Annual Volatility",
                  value: formatPercentage(risk_metrics.annual_volatility),
                  icon: <ShieldExclamationIcon className="h-8 w-8" />,
                  tooltip: "How much the stock price moves over time.",
                  status: getMetricStatus("Annual Volatility", risk_metrics.annual_volatility),
                },
                {
                  label: "Max Drawdown",
                  value: formatPercentage(risk_metrics.max_drawdown),
                  icon: <ArrowTrendingDownIcon className="h-8 w-8" />,
                  tooltip: "Largest observed price drop from a peak.",
                  status: getMetricStatus("Max Drawdown", risk_metrics.max_drawdown),
                },
                {
                  label: "Beta",
                  value: risk_metrics.beta ? risk_metrics.beta.toFixed(2) : "N/A",
                  icon: <ChartBarIcon className="h-8 w-8" />,
                  tooltip: "Stock's sensitivity to market movements.",
                  status: getMetricStatus("Beta", risk_metrics.beta),
                },
              ]}
            />

            {/* Technical Indicators */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5 text-primary" />
                  Technical Indicators
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Momentum (30d)</span>
                      <span
                        className={`text-sm font-medium ${stock.technical_analysis.momentum_30d >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {stock.technical_analysis.momentum_30d}%
                      </span>
                    </div>
                    <Progress
                      value={50 + stock.technical_analysis.momentum_30d}
                      className="h-2"
                      indicatorClassName={stock.technical_analysis.momentum_30d >= 0 ? "bg-green-500" : "bg-red-500"}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Momentum (90d)</span>
                      <span
                        className={`text-sm font-medium ${stock.technical_analysis.momentum_90d >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {stock.technical_analysis.momentum_90d}%
                      </span>
                    </div>
                    <Progress
                      value={50 + stock.technical_analysis.momentum_90d / 2}
                      className="h-2"
                      indicatorClassName={stock.technical_analysis.momentum_90d >= 0 ? "bg-green-500" : "bg-red-500"}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Volatility (30d)</span>
                      <span className="text-sm font-medium">{stock.technical_analysis.volatility_30d}%</span>
                    </div>
                    <Progress
                      value={Math.min(stock.technical_analysis.volatility_30d * 5, 100)}
                      className="h-2"
                      indicatorClassName="bg-amber-500"
                    />
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Golden Cross</span>
                      <Badge variant={stock.technical_analysis.golden_cross ? "success" : "outline"}>
                        {stock.technical_analysis.golden_cross ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Death Cross</span>
                      <Badge variant={stock.technical_analysis.death_cross ? "destructive" : "outline"}>
                        {stock.technical_analysis.death_cross ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

