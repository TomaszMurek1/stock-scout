"use client";

import React, { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { apiClient, API_URL } from "@/services/apiClient";
import { colors } from "./theme-colors";

// Theme Configuration - utilizing your existing theme-colors
const theme = {
  backgroundGradientClasses: `bg-gradient-to-br ${colors.backgroundGradient}`,
  accentOverlay: "bg-gradient-to-tr from-blue-50/50 via-transparent to-emerald-50/50",
  primaryText: "text-slate-900",
  secondaryText: "text-slate-600",
  mutedText: "text-slate-500",
  accentText: "text-emerald-600",
  chartGreen: "#10b981", // emerald-500
  chartRed: "#ef4444", // red-500
  chartOpacity: 1,
  liveIndicator: "bg-emerald-500",
  liveIndicatorText: "text-emerald-700",
  logoGradient: "from-indigo-600 to-blue-600",
  decorativeGradient: "from-blue-400/10 to-emerald-400/10",
  widgetBg: "bg-white/60 backdrop-blur-md",
  widgetBorder: "border-slate-200",
  mainBorder: "border-transparent",
};

interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockBannerProps {
  cardContentPadding?: string; // Prop to steer content density (margin/padding)
}

export const StockBanner: React.FC<StockBannerProps> = ({
  cardContentPadding = "p-4", // Default padding if not provided
}) => {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get<Candle[]>("/stocks-ohlc/NVDA/candles");
        if (response.data && response.data.length > 0) {
          setCandles(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch banner stock data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Data processing
  const displayData = candles.length > 0 ? candles : [];
  const latest =
    displayData.length > 0 ? displayData[displayData.length - 1] : { close: 0, volume: 0 };
  const previous = displayData.length > 1 ? displayData[displayData.length - 2] : latest;

  const currentPrice = latest.close;
  const priceChange = latest.close - previous.close;
  const percentChange = previous.close ? (priceChange / previous.close) * 100 : 0;
  const isPositive = priceChange >= 0;

      const minPrice = Math.min(...displayData.map((d) => d.low));
      const maxPrice = Math.max(...displayData.map((d) => d.high));
      const maxVolume = Math.max(...displayData.map((d) => d.volume));
      const priceRange = maxPrice - minPrice || 1;
  
      const firstCandle = displayData.length > 0 ? displayData[0] : null;
      const perf52Week = (firstCandle && latest.close)
          ? ((latest.close - firstCandle.open) / firstCandle.open) * 100
          : 0;
      const is52wPositive = perf52Week >= 0;
  
      const chartWidth = 300;
      const chartHeight = 80;  const candleWidth = Math.max(chartWidth / displayData.length - 1.5, 2);

  if (loading || displayData.length === 0) {
    return (
      <div
        className={`w-full min-w-[900px] max-w-[1400px] h-[256px] ${theme.backgroundGradientClasses} rounded-2xl overflow-hidden relative border ${theme.mainBorder} shadow-2xl flex items-center justify-center`}
      >
        <div className="flex flex-col items-center gap-3">
          <Activity className="w-8 h-8 text-slate-400 animate-bounce" />
          <span className="text-slate-400 text-sm font-medium">Loading Market Data...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full min-w-[900px] max-w-[1400px] rounded-2xl overflow-hidden relative shadow-2xl ${theme.backgroundGradientClasses} border ${theme.mainBorder}`}
    >
      {/* Subtle background overlay */}
      <div className={`absolute inset-0 ${theme.accentOverlay} pointer-events-none`} />

      <div className="relative z-10 flex items-center justify-between px-10 py-8 h-full gap-8">
        {/* Left Side - Branding & Messaging */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center space-x-4">
            <div
              className={`w-12 h-12 bg-gradient-to-br ${theme.logoGradient} rounded-xl flex items-center justify-center shadow-lg ring-1 ring-black/5`}
            >
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${theme.primaryText} tracking-tight`}>
                StockScan <span className="font-light text-slate-400">Pro</span>
              </h1>
              <div className="flex items-center space-x-2 mt-1">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full ${theme.liveIndicator} opacity-75`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${theme.liveIndicator}`}
                  ></span>
                </span>
                <span
                  className={`${theme.liveIndicatorText} text-xs font-bold uppercase tracking-wider`}
                >
                  Live Market Analysis
                </span>
              </div>
            </div>
          </div>

          <p className={`text-base ${theme.secondaryText} leading-relaxed max-w-lg font-medium`}>
            Real-time institutional-grade analytics, AI-powered thesis generation, and deep-dive
            metrics for the modern investor.
          </p>
        </div>

        {/* Right Side - Seamless Chart Widget */}
        <div className="flex-none">
          <div
            className={`${theme.widgetBg} border ${theme.widgetBorder} rounded-xl shadow-xl w-[420px]`}
          >
            {/* Controllable Padding Area */}
            <div className={cardContentPadding}>
              {/* Chart Header - Refined Layout */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4 w-full">
                  {/* Logo - Bigger Size */}
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0 overflow-hidden">
                    <img
                      src={`${API_URL}/stock-details/NVDA/logo`}
                      alt={`NVDA logo`}
                      className="h-full w-full object-contain p-1"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = `https://via.placeholder.com/40x40?text=N`;
                        target.className = "h-full w-full object-contain p-1 rounded-lg";
                      }}
                    />
                  </div>

                  {/* Left Block: Company Name & Market */}
                  <div className="flex flex-col justify-center items-start">
                    <span className={`${theme.primaryText} font-bold text-lg leading-none`}>
                      NVIDIA Corp.
                    </span>
                    <span className="text-xs font-semibold text-slate-400 mt-1">NASDAQ</span>
                  </div>

                  {/* Right Block: Price & Change (Pushed to right) */}
                  <div className="flex flex-col justify-center items-end ml-auto">
                    <span
                      className={`${theme.primaryText} font-mono font-bold text-lg leading-none`}
                    >
                      ${currentPrice.toFixed(2)}
                    </span>
                    <span
                      className={`text-xs font-bold ${isPositive ? "text-emerald-600" : "text-red-600"} mt-1`}
                    >
                      {isPositive ? "+" : ""}
                      {percentChange.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Clean Candlestick Chart */}
              <div className="relative h-[80px] w-full">
                <svg
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="overflow-visible"
                  preserveAspectRatio="none"
                >
                  {displayData.map((candle, index) => {
                    const x = index * (chartWidth / displayData.length) + candleWidth / 2;
                    const isGreen = candle.close > candle.open;

                    const highY =
                      chartHeight - ((candle.high - minPrice) / priceRange) * chartHeight;
                    const lowY = chartHeight - ((candle.low - minPrice) / priceRange) * chartHeight;
                    const openY =
                      chartHeight - ((candle.open - minPrice) / priceRange) * chartHeight;
                    const closeY =
                      chartHeight - ((candle.close - minPrice) / priceRange) * chartHeight;

                    const bodyTop = Math.min(openY, closeY);
                    const bodyHeight = Math.max(Math.abs(closeY - openY), 1);

                    // Volume bar - Increased height for visibility
                    const volumeHeight = (candle.volume / maxVolume) * (chartHeight * 0.8);
                    const volumeY = chartHeight - volumeHeight;

                    return (
                      <g key={index} className="hover:opacity-80 transition-opacity">
                        {/* Volume Bar */}
                        <rect
                          x={x - candleWidth / 2}
                          y={volumeY}
                          width={candleWidth}
                          height={volumeHeight}
                          fill={isGreen ? theme.chartGreen : theme.chartRed}
                          opacity={0.1}
                          rx="0.5"
                        />
                        {/* Wick */}
                        <line
                          x1={x}
                          y1={highY}
                          x2={x}
                          y2={lowY}
                          stroke={isGreen ? theme.chartGreen : theme.chartRed}
                          strokeWidth="1"
                          opacity={theme.chartOpacity}
                          strokeLinecap="round"
                        />
                        {/* Body */}
                        <rect
                          x={x - candleWidth / 2}
                          y={bodyTop}
                          width={candleWidth}
                          height={bodyHeight}
                          fill={isGreen ? theme.chartGreen : theme.chartRed}
                          rx="1"
                          opacity={theme.chartOpacity}
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Chart Footer */}
              <div className="mt-4 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <div className="flex gap-2">
                    <span>52-Week Perf.</span>
                    <span className={`${is52wPositive ? "text-emerald-600" : "text-red-600"}`}>
                        {is52wPositive ? "+" : ""}{perf52Week.toFixed(2)}%
                    </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-500">
                    Vol: {(latest.volume / 1_000_000).toFixed(1)}M
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Blur Element */}
      <div
        className={`absolute -bottom-24 -right-24 w-80 h-80 bg-gradient-to-tl ${theme.decorativeGradient} rounded-full blur-[100px] pointer-events-none`}
      />
      <div
        className={`absolute -top-24 -left-24 w-60 h-60 bg-blue-500/05 rounded-full blur-[80px] pointer-events-none`}
      />
    </div>
  );
};
