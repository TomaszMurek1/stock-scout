import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import StockChart from "./stock-chart";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const StockOnePager = () => {
  const { ticker } = useParams(); // Get ticker from URL

  const [stock, setStock] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchStockData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/stock-details/${ticker}`);
        if (!response.ok) {
          throw new Error("Failed to fetch stock details.");
        }
        const data = await response.json();
        setStock(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStockData();
  }, [ticker]);

  if (isLoading) {
    return (
      <div className="text-center text-gray-600 mt-6">Loading stock details...</div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 mt-6">Error: {error}</div>;
  }

  if (!stock) {
    return (
      <div className="text-center text-gray-500 mt-6">No data available.</div>
    );
  }

  // Merge stock prices + SMAs for chart
  const historicalData = (stock?.technical_analysis?.stock_prices || []).map(
    (price: any) => {
      const sma50Entry = stock.technical_analysis.sma_50.find(
        (sma: any) => sma.date === price.date
      );
      const sma200Entry = stock.technical_analysis.sma_200.find(
        (sma: any) => sma.date === price.date
      );
      return {
        date: price.date,
        price: price.close,
        sma50: sma50Entry ? sma50Entry.SMA_50 : null,
        sma200: sma200Entry ? sma200Entry.SMA_200 : null,
      };
    }
  );

  // Basic percentage formatter
  const formatPercentage = (value: number) =>
    value ? `${(value * 100).toFixed(2)}%` : "N/A";

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {stock.executive_summary?.ticker} - {stock.executive_summary?.name}
        </h1>
        <p className="text-gray-600">
          {stock.executive_summary?.sector} — {stock.executive_summary?.industry}
        </p>
      </div>

      {/* Two columns: left for summary/financials, right for chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Column Card */}
        <Card className="border shadow-sm h-full max-h-[600px] overflow-auto">
          <CardHeader>
            <CardTitle className="text-lg text-gray-800">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <Accordion type="multiple" className="w-full">
              {/* Executive Summary */}
              <AccordionItem value="summary">
                <AccordionTrigger className="text-base font-semibold">
                  Executive Summary
                </AccordionTrigger>
                <AccordionContent>
                  <div className="mt-2">
                    <p className="text-sm text-gray-800">
                      <strong>Currency:</strong>{" "}
                      {stock.executive_summary?.currency}
                    </p>
                    <p className="text-sm text-gray-800 mt-1">
                      {stock.executive_summary?.description ||
                        "No summary available."}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Financial Performance */}
              <AccordionItem value="financials">
                <AccordionTrigger className="text-base font-semibold">
                  Financial Performance
                </AccordionTrigger>
                <AccordionContent>
                  <div className="mt-2 text-sm text-gray-800 space-y-1">
                    <p>
                      <strong>Gross Margin:</strong>{" "}
                      {formatPercentage(stock.financial_performance.gross_margin)}
                    </p>
                    <p>
                      <strong>Operating Margin:</strong>{" "}
                      {formatPercentage(stock.financial_performance.operating_margin)}
                    </p>
                    <p>
                      <strong>Net Margin:</strong>{" "}
                      {formatPercentage(stock.financial_performance.net_margin)}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Right Column Card */}
        <Card className="border shadow-sm h-full max-h-[600px] overflow-auto">
          <CardHeader>
            <CardTitle className="text-lg text-gray-800">
              Technical Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="text-gray-700">
            <Accordion type="single" collapsible className="w-full" defaultValue="chart">
              <AccordionItem value="chart">
                <AccordionTrigger className="text-base font-semibold">
                  Price Chart
                </AccordionTrigger>
                <AccordionContent>
                  {/* Stock Chart */}
                  <div className="mt-4">
                    <StockChart historicalData={historicalData} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
