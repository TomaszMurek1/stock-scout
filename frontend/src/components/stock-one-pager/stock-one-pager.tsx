import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import StockChart from "./stock-chart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const StockOnePager = () => {
  const { ticker } = useParams();
  const [stock, setStock] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLogoAvailable, setIsLogoAvailable] = useState(true);

  // Fetch stock data
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

  const formatPercentage = (value: number) => (value ? `${(value * 100).toFixed(2)}%` : "N/A");

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

  // ─────────────────────────────
  // Render States
  // ─────────────────────────────

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

  const { executive_summary, financial_performance } = stock;
  const chartData = getChartData();
  const logoUrl = `https://financialmodelingprep.com/image-stock/${ticker}.png`;

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8">
      {/* Header Section */}
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
              {executive_summary?.sector} — {executive_summary?.industry}
            </p>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <Card className="border border-gray-200 shadow-sm bg-white mb-8">
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-xl text-gray-800">Executive Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-gray-700 leading-relaxed">
            {executive_summary?.description || "No summary available."}
          </p>
        </CardContent>
      </Card>

      {/* Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart */}
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

        {/* Financial Performance */}
        <Card className="border border-gray-400 shadow-sm bg-white">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-xl text-gray-800">Financial Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Gross Margin", value: financial_performance.gross_margin },
                { label: "Operating Margin", value: financial_performance.operating_margin },
                { label: "Net Margin", value: financial_performance.net_margin },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">{item.label}</p>
                  <p className="text-2xl font-semibold text-gray-800">
                    {formatPercentage(item.value)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
