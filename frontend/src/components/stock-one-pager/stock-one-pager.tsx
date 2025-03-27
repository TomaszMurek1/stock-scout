// src/components/StockOnePager/StockOnePager.tsx

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { StockData } from "./stock-one-pager.types";
import StockChart from "./stock-chart";
import { MetricsCard } from "./metric-card";
import { getMetricStatus } from "./metric-utils";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

function formatPercentage(value: number | null) {
  return value !== null ? `${(value * 100).toFixed(2)}%` : "N/A";
}

export const StockOnePager = () => {
  const { ticker } = useParams();
  const [stock, setStock] = useState<StockData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLogoAvailable, setIsLogoAvailable] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${API_URL}/stock-details/${ticker}`);
        if (!response.ok) {
          const errBody = await response.json();
          throw new Error(errBody.detail || "Failed to fetch stock details.");
        }

        const data: StockData = await response.json();
        setStock(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [ticker]);

  const getChartData = () => {
    if (!stock) return [];
    const { stock_prices, sma_50, sma_200 } = stock.technical_analysis;

    return stock_prices.map(price => {
      const sma50Entry = sma_50.find(s => s.date === price.date);
      const sma200Entry = sma_200.find(s => s.date === price.date);

      return {
        date: price.date,
        price: price.close,
        sma50: sma50Entry?.SMA_50 ?? null,
        sma200: sma200Entry?.SMA_200 ?? null,
      };
    });
  };

  if (isLoading || !stock) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading stock details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-500 p-6 bg-red-50 rounded-lg border border-red-100">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const {
    executive_summary,
    company_overview,
    financial_performance,
    investor_metrics,
    valuation_metrics,
    risk_metrics
  } = stock;

  const chartData = getChartData();
  const logoUrl = `https://financialmodelingprep.com/image-stock/${ticker}.png`;

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8">
      <div className="mb-6 p-4 rounded-md bg-white shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {isLogoAvailable && (
            <div className="flex-shrink-0">
              <img
                src={logoUrl}
                alt={`${executive_summary?.name} logo`}
                className="w-32 h-32 object-contain bg-gray-200 rounded"
                onError={() => setIsLogoAvailable(false)}
              />
            </div>
          )}
          <div className="text-left">
            <h1 className="text-3xl font-bold text-gray-800">{executive_summary?.name}</h1>
            <p className="text-gray-600 mt-2">
              {company_overview?.sector} — {company_overview?.industry}
            </p>
          </div>
        </div>
      </div>

      <Card className="border border-gray-200 shadow-sm bg-white mb-8">
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-xl text-gray-800">Executive Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-left text-gray-700 leading-relaxed">
            {company_overview?.description || "No summary available."}
          </p>
        </CardContent>
      </Card>

      <MetricsCard
        title="Financial Performance"
        metrics={[
          {
            label: "Gross Margin",
            value: formatPercentage(financial_performance.gross_margin),
            icon: <ChartPieIcon className="h-8 w-8" />,
            tooltip: "Percentage of revenue remaining after cost of goods sold.",
            status: getMetricStatus("Gross Margin", financial_performance.gross_margin)
          },
          {
            label: "Operating Margin",
            value: formatPercentage(financial_performance.operating_margin),
            icon: <Cog6ToothIcon className="h-8 w-8" />,
            tooltip: "Profitability from core operations.",
            status: getMetricStatus("Operating Margin", financial_performance.operating_margin)
          },
          {
            label: "Net Margin",
            value: formatPercentage(financial_performance.net_margin),
            icon: <BanknotesIcon className="h-8 w-8" />,
            tooltip: "Net income as a percentage of revenue.",
            status: getMetricStatus("Net Margin", financial_performance.net_margin)
          }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
        <Card className="border border-gray-400 rounded-md shadow-sm bg-white">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-xl text-gray-800">Technical Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[460px]">
              <StockChart historicalData={chartData} />
            </div>
          </CardContent>
        </Card>

        <MetricsCard
          title="Valuation Metrics"
          metrics={[
            {
              label: "P/E Ratio",
              value: valuation_metrics.pe_ratio?.toFixed(2) || "N/A",
              icon: <ScaleIcon className="h-8 w-8" />,
              tooltip: "Price to Earnings ratio.",
              status: getMetricStatus("P/E Ratio", valuation_metrics.pe_ratio)
            },
            {
              label: "EV/EBITDA",
              value: valuation_metrics.ev_ebitda?.toFixed(2) || "N/A",
              icon: <CurrencyDollarIcon className="h-8 w-8" />,
              tooltip: "Enterprise Value / EBITDA.",
              status: getMetricStatus("EV/EBITDA", valuation_metrics.ev_ebitda)
            },
            {
              label: "PEG Ratio",
              value: valuation_metrics.peg_ratio?.toFixed(2) || "N/A",
              icon: <ArrowTrendingUpIcon className="h-8 w-8" />,
              tooltip: "P/E ratio adjusted for growth.",
              status: getMetricStatus("PEG Ratio", valuation_metrics.peg_ratio)
            },
            {
              label: "Dividend Yield",
              value: valuation_metrics.dividend_yield !== null ? formatPercentage(valuation_metrics.dividend_yield) : "N/A",
              icon: <BanknotesIcon className="h-8 w-8" />,
              tooltip: "Dividends relative to share price.",
              status: getMetricStatus("Dividend Yield", valuation_metrics.dividend_yield)
            },
            {
              label: "Price to Sales",
              value: valuation_metrics.price_to_sales?.toFixed(2) ?? "N/A",
              icon: <BanknotesIcon className="h-8 w-8" />,
              tooltip: "Market cap / revenue.",
              status: getMetricStatus("Price to Sales", valuation_metrics.price_to_sales)
            },
            {
              label: "Price to Book",
              value: valuation_metrics.price_to_book?.toFixed(2) ?? "N/A",
              icon: <ScaleIcon className="h-8 w-8" />,
              tooltip: "Share price relative to book value.",
              status: getMetricStatus("Price to Book", valuation_metrics.price_to_book)
            },
          ]}
        />
      </div>

      <div className="mt-10">
        <MetricsCard
          title="Investor Metrics"
          metrics={[
            {
              label: "Rule of 40",
              value: `${investor_metrics.rule_of_40.toFixed(2)}%`,
              icon: <ScaleIcon className="h-8 w-8" />,
              tooltip: "Growth + profitability should exceed 40%.",
              status: getMetricStatus("Rule of 40", investor_metrics.rule_of_40 / 100)
            },
            {
              label: "EBITDA Margin",
              value: formatPercentage(investor_metrics.ebitda_margin),
              icon: <CurrencyDollarIcon className="h-8 w-8" />,
              tooltip: "Earnings before interest & taxes.",
              status: getMetricStatus("EBITDA Margin", investor_metrics.ebitda_margin)
            },
            {
              label: "Revenue Growth",
              value: `${investor_metrics.revenue_growth.toFixed(2)}%`,
              icon: investor_metrics.revenue_growth >= 0
                ? <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
                : <ArrowTrendingDownIcon className="h-8 w-8 text-red-600" />,
              tooltip: "YoY revenue growth.",
              status: getMetricStatus("Revenue Growth", investor_metrics.revenue_growth / 100)
            },
            {
              label: "FCF Margin",
              value: formatPercentage(investor_metrics.fcf_margin),
              icon: <BanknotesIcon className="h-8 w-8" />,
              tooltip: "Free cash flow to revenue ratio.",
              status: getMetricStatus("FCF Margin", investor_metrics.fcf_margin)
            },
            {
              label: "Cash Conversion",
              value: `${investor_metrics.cash_conversion_ratio.toFixed(2)}%`,
              icon: <ArrowsRightLeftIcon className="h-8 w-8" />,
              tooltip: "Conversion of profits to cash.",
              status: getMetricStatus("Cash Conversion", investor_metrics.cash_conversion_ratio)
            },
            {
              label: "CapEx Ratio",
              value: investor_metrics.capex_ratio.toFixed(2),
              icon: <Cog6ToothIcon className="h-8 w-8" />,
              tooltip: "Capital expenditures intensity.",
              status: getMetricStatus("CapEx Ratio", investor_metrics.capex_ratio)
            },
          ]}
        />
      </div>

      <div className="mt-10">
        <MetricsCard
          title="Risk Metrics"
          metrics={[
            {
              label: "Annual Volatility",
              value: formatPercentage(risk_metrics.annual_volatility),
              icon: <ShieldExclamationIcon className="h-8 w-8 text-orange-600" />,
              tooltip: "How much the stock price moves over time.",
              status: getMetricStatus("Annual Volatility", risk_metrics.annual_volatility)
            },
            {
              label: "Max Drawdown",
              value: formatPercentage(risk_metrics.max_drawdown),
              icon: <ArrowTrendingDownIcon className="h-8 w-8 text-red-600" />,
              tooltip: "Largest observed price drop from a peak.",
              status: getMetricStatus("Max Drawdown", risk_metrics.max_drawdown)
            },
            {
              label: "Beta",
              value: risk_metrics.beta ? risk_metrics.beta.toFixed(2) : "N/A",
              icon: <ChartBarIcon className="h-8 w-8" />,
              tooltip: "Stock's sensitivity to market movements.",
              status: getMetricStatus("Beta", risk_metrics.beta)
            },
          ]}
        />
      </div>
    </div>
  );
};