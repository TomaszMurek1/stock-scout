"use client"

import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import StockChart from "./stock-chart"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api"

export const StockOnePager = () => {
  const { ticker } = useParams() // Get ticker from URL

  const [stock, setStock] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data
  useEffect(() => {
    const fetchStockData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`${API_URL}/stock-details/${ticker}`)
        if (!response.ok) {
          throw new Error("Failed to fetch stock details.")
        }
        const data = await response.json()
        setStock(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStockData()
  }, [ticker])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading stock details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-500 p-6 bg-red-50 rounded-lg border border-red-100">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!stock) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-500 p-6 bg-gray-50 rounded-lg border border-gray-100">
          <p className="font-semibold">No Data Available</p>
          <p>The requested stock information could not be found.</p>
        </div>
      </div>
    )
  }

  // Merge stock prices + SMAs for chart
  const historicalData = (stock?.technical_analysis?.stock_prices || []).map((price: any) => {
    const sma50Entry = stock.technical_analysis.sma_50.find((sma: any) => sma.date === price.date)
    const sma200Entry = stock.technical_analysis.sma_200.find((sma: any) => sma.date === price.date)
    return {
      date: price.date,
      price: price.close,
      sma50: sma50Entry ? sma50Entry.SMA_50 : null,
      sma200: sma200Entry ? sma200Entry.SMA_200 : null,
    }
  })

  // Basic percentage formatter
  const formatPercentage = (value: number) => (value ? `${(value * 100).toFixed(2)}%` : "N/A")

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8 ">
      {/* Header Section */}
      <div className="mb-6 p-2 rounded-md">
        <div className="flex flex-col md:flex-row md:items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {stock.executive_summary?.name} - {stock.executive_summary?.ticker} 
            </h1>
            <p className="text-gray-600 mt-2 ml-8">
              {stock.executive_summary?.sector} — {stock.executive_summary?.industry}
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <p className="text-sm text-gray-500">
              Currency: <span className="font-medium text-gray-700">{stock.executive_summary?.currency}</span>
            </p>
          </div>
        </div>
     
      </div>

      {/* Main Content - Reordered to put chart on top */}
      <div className="space-y-8 ">
         {/* Executive Summary */}
         <Card className="border border-gray-200 shadow-sm bg-white">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-xl text-gray-800">Executive Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-700 leading-relaxed">
                {stock.executive_summary?.description || "No summary available."}
              </p>
            </CardContent>
          </Card>

        {/* Information Section - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart */}
          <Card className="border border-gray-400 rounded-md shadow-sm bg-white">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-xl text-gray-800" >Technical Analysis</CardTitle>
            </CardHeader>
            <CardContent >
              <div className="h-[460px]">
                <StockChart historicalData={historicalData} />
              </div>
            </CardContent>
          </Card>
         

          {/* Financial Performance */}
          <Card className="border border-gray-400 shadow-sm bg-white">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-xl text-gray-800">Financial Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Gross Margin</p>
                  <p className="text-2xl font-semibold text-gray-800">
                    {formatPercentage(stock.financial_performance.gross_margin)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Operating Margin</p>
                  <p className="text-2xl font-semibold text-gray-800">
                    {formatPercentage(stock.financial_performance.operating_margin)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Net Margin</p>
                  <p className="text-2xl font-semibold text-gray-800">
                    {formatPercentage(stock.financial_performance.net_margin)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

