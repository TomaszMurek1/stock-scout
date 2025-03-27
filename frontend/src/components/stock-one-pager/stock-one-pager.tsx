import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import StockChart from "./stock-chart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
} from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const formatPercentage = (value: number | null) => value !== null ? `${(value * 100).toFixed(2)}%` : "N/A";

const MetricsCard = ({ title, metrics }: { title: string; metrics: { label: string; value: string; icon: JSX.Element; tooltip: string }[] }) => (
  <Card className="border border-gray-200 shadow-md bg-white">
    <CardHeader className="pb-2 border-b">
      <CardTitle className="text-xl text-gray-800">{title}</CardTitle>
    </CardHeader>
    <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {metrics.map(({ label, value, icon, tooltip }) => (
        <TooltipProvider key={label}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-start gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100 hover:shadow transition">
                <div className="text-blue-600">{icon}</div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">{label}</p>
                  <p className="text-2xl font-semibold text-gray-900">{value}</p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px] text-sm text-gray-700 bg-white border border-gray-200 p-2 rounded shadow-md">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </CardContent>
  </Card>
);

export const StockOnePager = () => {
  const { ticker } = useParams();
  const [stock, setStock] = useState<any>(null);
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
          const err = await response.json();
          throw new Error(err.detail || "Failed to fetch stock details.");
        }
        const data = await response.json();
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
    return (stock?.technical_analysis?.stock_prices || []).map((price: any) => {
      const sma50 = stock.technical_analysis.sma_50.find((sma: any) => sma.date === price.date);
      const sma200 = stock.technical_analysis.sma_200.find((sma: any) => sma.date === price.date);
      return {
        date: price.date,
        price: price.close,
        sma50: sma50?.SMA_50 ?? null,
        sma200: sma200?.SMA_200 ?? null,
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

  const { executive_summary, company_overview, financial_performance, investor_metrics, valuation_metrics, risk_metrics } = stock;
  const chartData = getChartData();
  const logoUrl = `https://financialmodelingprep.com/image-stock/${ticker}.png`;

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8">
      {/* Header */}
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

      {/* Summary */}
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

      {/* Financial Performance */}
      <MetricsCard
        title="Financial Performance"
        metrics={[
          {
            label: "Gross Margin",
            value: formatPercentage(financial_performance.gross_margin),
            icon: <ChartPieIcon className="h-8 w-8" />,
            tooltip: "Percentage of revenue remaining after cost of goods sold."
          },
          {
            label: "Operating Margin",
            value: formatPercentage(financial_performance.operating_margin),
            icon: <Cog6ToothIcon className="h-8 w-8" />,
            tooltip: "Profitability from core operations."
          },
          {
            label: "Net Margin",
            value: formatPercentage(financial_performance.net_margin),
            icon: <BanknotesIcon className="h-8 w-8" />,
            tooltip: "Net income as a percentage of revenue."
          }
        ]}
      />

      {/* Chart & Metrics */}
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
            { label: "P/E Ratio", value: valuation_metrics.pe_ratio?.toFixed(2) || "N/A", icon: <ScaleIcon className="h-8 w-8" />, tooltip: "Price to Earnings ratio." },
            { label: "EV/EBITDA", value: valuation_metrics.ev_ebitda?.toFixed(2) || "N/A", icon: <CurrencyDollarIcon className="h-8 w-8" />, tooltip: "Enterprise Value / EBITDA." },
            { label: "PEG Ratio", value: valuation_metrics.peg_ratio?.toFixed(2) || "N/A", icon: <ArrowTrendingUpIcon className="h-8 w-8" />, tooltip: "P/E ratio adjusted for growth." },
            { label: "Dividend Yield", value: valuation_metrics.dividend_yield ? formatPercentage(valuation_metrics.dividend_yield) : "N/A", icon: <BanknotesIcon className="h-8 w-8" />, tooltip: "Dividends relative to share price." },
          ]}
        />
      </div>

      {/* Other Metrics */}
      <div className="mt-10">
        <MetricsCard
          title="Investor Metr1ics"
          metrics={[
            { label: "Rule of 40", value: `${investor_metrics.rule_of_40.toFixed(2)}%`, icon: <ScaleIcon className="h-8 w-8" />, tooltip: "Growth + profitability should exceed 40%." },
            { label: "EBITDA Margin", value: formatPercentage(investor_metrics.ebitda_margin), icon: <CurrencyDollarIcon className="h-8 w-8" />, tooltip: "Earnings before interest & taxes." },
            { label: "Revenue Growth", value: `${investor_metrics.revenue_growth.toFixed(2)}%`, icon: investor_metrics.revenue_growth >= 0 ? <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" /> : <ArrowTrendingDownIcon className="h-8 w-8 text-red-600" />, tooltip: "YoY revenue growth." },
            { label: "FCF Margin", value: formatPercentage(investor_metrics.fcf_margin), icon: <BanknotesIcon className="h-8 w-8" />, tooltip: "Free cash flow to revenue ratio." },
            { label: "Cash Conversion", value: `${investor_metrics.cash_conversion_ratio.toFixed(2)}%`, icon: <ArrowsRightLeftIcon className="h-8 w-8" />, tooltip: "Conversion of profits to cash." },
            { label: "CapEx Ratio", value: investor_metrics.capex_ratio.toFixed(2), icon: <Cog6ToothIcon className="h-8 w-8" />, tooltip: "Capital expenditures intensity." },
          ]}
        />
      </div>

      <div className="mt-10">
        <MetricsCard
          title="Risk Metrics"
          metrics={[
            { label: "Annual Volatility", value: formatPercentage(risk_metrics.annual_volatility), icon: <ShieldExclamationIcon className="h-8 w-8 text-orange-600" />, tooltip: "How much the stock price moves over time." },
            { label: "Max Drawdown", value: formatPercentage(risk_metrics.max_drawdown), icon: <ArrowTrendingDownIcon className="h-8 w-8 text-red-600" />, tooltip: "Largest observed price drop from a peak." },
            { label: "Beta", value: risk_metrics.beta ? risk_metrics.beta.toFixed(2) : "N/A", icon: <ChartBarIcon className="h-8 w-8" />, tooltip: "Stock's sensitivity to market movements." },
          ]}
        />
      </div>
    </div>
  );
};
