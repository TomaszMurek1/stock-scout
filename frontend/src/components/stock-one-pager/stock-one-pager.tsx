import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import StockChart from "./stock-chart";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const StockOnePager = () => {
  const { ticker } = useParams(); // Get ticker from URL

  const [stock, setStock] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [expandSummary, setExpandSummary] = useState(true);
  const [expandFinancials, setExpandFinancials] = useState(false);
  const [expandTechnical, setExpandTechnical] = useState(false);

  useEffect(() => {
    const fetchStockData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/stock-details/${ticker}`);

        if (!response.ok) {
          throw new Error("Failed to fetch stock details");
        }

        const data = await response.json();
        setStock(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStockData();
  }, [ticker]);

  if (isLoading) {
    return <div className="text-center text-gray-600 mt-6">Loading stock details...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 mt-6">Error: {error}</div>;
  }

  if (!stock) {
    return <div className="text-center text-gray-500 mt-6">No data available.</div>;
  }

  // 🟢 Formatting Functions
  const formatPercentage = (value) => (value ? `${(value * 100).toFixed(2)}%` : "N/A");

  // 🟢 Merge stock prices, SMA 50, and SMA 200 into one dataset for the chart
  const historicalData = stock.technical_analysis.stock_prices.map((price) => {
    const sma50Entry = stock.technical_analysis.sma_50.find((sma) => sma.date === price.date);
    const sma200Entry = stock.technical_analysis.sma_200.find((sma) => sma.date === price.date);
    return {
      date: price.date,
      price: price.close,
      sma50: sma50Entry ? sma50Entry.SMA_50 : null,
      sma200: sma200Entry ? sma200Entry.SMA_200 : null,
    };
  });

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md border border-gray-300 mt-6">
      {/* 🏢 EXECUTIVE SUMMARY */}
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        {stock.executive_summary.ticker} - {stock.executive_summary.name}
      </h2>
      <p className="text-gray-600 mb-2">
        <strong>Sector:</strong> {stock.executive_summary.sector}
      </p>
      <p className="text-gray-600 mb-2">
        <strong>Industry:</strong> {stock.executive_summary.industry}
      </p>
      <p className="text-gray-600 mb-4">
        <strong>Currency:</strong> {stock.executive_summary.currency}
      </p>

      {/* 🔹 EXECUTIVE SUMMARY SECTION */}
      <div className="mb-4">
        <button
          className="w-full text-left text-lg font-semibold bg-gray-200 px-4 py-2 rounded"
          onClick={() => setExpandSummary(!expandSummary)}
        >
          Executive Summary {expandSummary ? "▲" : "▼"}
        </button>
        {expandSummary && (
          <div className="p-4 text-gray-700">{stock.executive_summary.description || "No summary available"}</div>
        )}
      </div>

      {/* 🔹 FINANCIAL PERFORMANCE SECTION */}
      <div className="mb-4">
        <button
          className="w-full text-left text-lg font-semibold bg-gray-200 px-4 py-2 rounded"
          onClick={() => setExpandFinancials(!expandFinancials)}
        >
          Financial Performance {expandFinancials ? "▲" : "▼"}
        </button>
        {expandFinancials && (
          <div className="p-4 text-gray-700">
            <p><strong>Gross Margin (Last Year):</strong> {formatPercentage(stock.financial_performance.gross_margin)}</p>
            <p><strong>Operating Margin (Last Year):</strong> {formatPercentage(stock.financial_performance.operating_margin)}</p>
            <p><strong>Net Margin (Last Year):</strong> {formatPercentage(stock.financial_performance.net_margin)}</p>
          </div>
        )}
      </div>

      {/* 🔹 TECHNICAL ANALYSIS SECTION */}
      <div className="mb-4">
        <button
          className="w-full text-left text-lg font-semibold bg-gray-200 px-4 py-2 rounded"
          onClick={() => setExpandTechnical(!expandTechnical)}
        >
          Technical Analysis {expandTechnical ? "▲" : "▼"}
        </button>
        {expandTechnical && (
         
            <StockChart historicalData={historicalData} />

      
        )}
      </div>
    </div>
  );
};


