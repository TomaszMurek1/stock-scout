"use client"

import { Activity } from "lucide-react"
import { colors } from "./theme-colors"

// Simplified candlestick data
const candlestickData = [
    { open: 425.5, high: 428.2, low: 424.8, close: 427.9 },
    { open: 427.9, high: 432.1, low: 426.5, close: 431.2 },
    { open: 431.2, high: 435.8, low: 430.1, close: 434.6 },
    { open: 434.6, high: 436.9, low: 432.3, close: 433.8 },
    { open: 433.8, high: 439.2, low: 433.1, close: 438.5 },
    { open: 438.5, high: 441.7, low: 437.9, close: 440.8 },
    { open: 440.8, high: 443.5, low: 439.2, close: 442.1 },
    { open: 442.1, high: 444.8, low: 441.3, close: 443.9 },
    { open: 443.9, high: 447.2, low: 442.8, close: 446.5 },
    { open: 446.5, high: 449.8, low: 445.1, close: 448.2 },
]

export default function ElegantStockScanBanner() {
    const minPrice = Math.min(...candlestickData.map((d) => d.low))
    const maxPrice = Math.max(...candlestickData.map((d) => d.high))
    const priceRange = maxPrice - minPrice
    const chartWidth = 300
    const chartHeight = 80
    const candleWidth = chartWidth / candlestickData.length - 2

    return (
        <div
            className={`w-full min-w-[900px] max-w-[1400px] h-[256px]  bg-gradient-to-br ${colors.backgroundGradient} overflow-hidden relative`}
        >
            {/* Subtle background gradient */}
            <div className={`absolute inset-0 bg-gradient-to-r ${colors.accentOverlay}`} />

            {/* Main Content */}
            <div className="relative z-10 h-full flex items-center justify-between px-16">
                {/* Left Side - Branding */}
                <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-6">
                        <div
                            className={`w-12 h-12 bg-gradient-to-r ${colors.logoGradient} rounded-xl flex items-center justify-center shadow-lg`}
                        >
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className={`text-3xl font-bold ${colors.primaryText} tracking-tight`}>StockScan Pro</h1>
                            <div className="flex items-center space-x-2 mt-1">
                                <div className={`w-2 h-2 ${colors.liveIndicator} rounded-full animate-pulse`} />
                                <span className={`${colors.liveIndicatorText} text-sm`}>Live Analysis</span>
                            </div>
                        </div>
                    </div>

                    <p className={`text-lg ${colors.secondaryText} leading-relaxed max-w-md`}>
                        Discover, analyze, and compare stocks with live trend analysis and modern investing tools.
                    </p>
                </div>

                {/* Right Side - Seamless Chart */}
                <div className="flex-1 flex justify-end">
                    <div className="p-8">
                        {/* Simple Chart Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-3">
                                <div
                                    className={`w-8 h-8 bg-gradient-to-r ${colors.logoGradient} rounded-lg flex items-center justify-center`}
                                >
                                    <span className="text-white text-sm font-bold">N</span>
                                </div>
                                <div>
                                    <span className={`${colors.accentText} font-semibold`}>NVDA</span>
                                    <span className={`${colors.mutedText} text-sm ml-2`}>$448.20</span>
                                </div>
                            </div>
                            <span className={`${colors.liveIndicatorText} text-sm font-medium`}>+5.34%</span>
                        </div>

                        {/* Clean Candlestick Chart */}
                        <svg width={chartWidth} height={chartHeight} className="overflow-visible">
                            {candlestickData.map((candle, index) => {
                                const x = index * (chartWidth / candlestickData.length) + candleWidth / 2
                                const isGreen = candle.close > candle.open

                                const highY = chartHeight - ((candle.high - minPrice) / priceRange) * chartHeight
                                const lowY = chartHeight - ((candle.low - minPrice) / priceRange) * chartHeight
                                const openY = chartHeight - ((candle.open - minPrice) / priceRange) * chartHeight
                                const closeY = chartHeight - ((candle.close - minPrice) / priceRange) * chartHeight

                                const bodyTop = Math.min(openY, closeY)
                                const bodyHeight = Math.abs(closeY - openY)

                                return (
                                    <g key={index}>
                                        {/* Wick */}
                                        <line
                                            x1={x}
                                            y1={highY}
                                            x2={x}
                                            y2={lowY}
                                            stroke={isGreen ? colors.chartGreen : colors.chartRed}
                                            strokeWidth="1.5"
                                            opacity={colors.chartOpacity}
                                        />
                                        {/* Body */}
                                        <rect
                                            x={x - candleWidth / 3}
                                            y={bodyTop}
                                            width={candleWidth / 1.5}
                                            height={Math.max(bodyHeight, 2)}
                                            fill={isGreen ? colors.chartGreen : colors.chartRed}
                                            rx="1"
                                            opacity={colors.chartOpacity}
                                        />
                                    </g>
                                )
                            })}
                        </svg>

                        {/* Simple Chart Footer */}
                        <div className="mt-4 text-center">
                            <span className={`${colors.mutedText} text-xs`}>Intraday Performance</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Minimal decorative element */}
            <div
                className={`absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl ${colors.decorativeGradient} rounded-full blur-3xl`}
            />
        </div>
    )
}
