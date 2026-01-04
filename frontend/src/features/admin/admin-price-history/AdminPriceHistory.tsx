import { useState } from "react";
import { Button as MuiButton, CircularProgress, TextField, Checkbox, FormControlLabel } from "@mui/material";
import { toast } from "react-toastify";
import { apiClient } from "@/services/apiClient";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import BasketChipSelector from "@/components/shared/forms/BasketChipSelector";
import { useScanJob } from "@/hooks/useScanJob";

interface PriceHistoryResult {
  market: string;
  tickers: string[];
  count: number;
  status: string;
  error?: string;
}

interface PriceHistoryResponse {
  status: string;
  message: string;
  companies_processed: number;
  date_range: {
    start: string;
    end: string;
  };
  results: PriceHistoryResult[];
}

export default function AdminPriceHistory() {
  const [selectedBaskets, setSelectedBaskets] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(() => {
    // Default to 365 days ago
    const date = new Date();
    date.setDate(date.getDate() - 365);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    // Default to today
    return new Date().toISOString().split("T")[0];
  });
  const [minMarketCap, setMinMarketCap] = useState<number>(500); // Default 500M USD
  const [forceUpdate, setForceUpdate] = useState(false);
  
  const { startJob, isLoading, result, error, status } = useScanJob<PriceHistoryResponse>({
      onCompleted: (data) => toast.success(data.message || "Price history populated successfully")
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (selectedBaskets.length === 0) {
      toast.error("Please select at least one basket");
      return;
    }

    startJob(() => 
        apiClient.post(
            "/admin/populate-price-history",
            {
              basket_ids: selectedBaskets.map((id) => Number(id)),
              start_date: startDate,
              end_date: endDate,
              force_update: forceUpdate,
              min_market_cap: minMarketCap > 0 ? minMarketCap : null,
            }
        )
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <FormCardGenerator
        title="Populate Historical Price Data"
        subtitle="Fetch and store historical OHLCV data for companies in selected baskets. Useful for ensuring scanners have sufficient historical data."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-1 gap-4">
            <div>
              <BasketChipSelector
                value={selectedBaskets}
                onChange={setSelectedBaskets}
                label="Select Baskets"
                description="Choose baskets to fetch historical price data for their companies."
              />
            </div>

            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              helperText="Beginning of the date range (default: 365 days ago)"
            />

            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              helperText="End of the date range (default: today)"
            />

            <TextField
              label="Min Market Cap (Millions USD)"
              type="number"
              value={minMarketCap}
              onChange={(e) => setMinMarketCap(Number(e.target.value))}
              size="small"
              helperText="Filter companies by minimum market cap in millions USD (0 = no filter)"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={forceUpdate}
                  onChange={(e) => setForceUpdate(e.target.checked)}
                />
              }
              label="Force Update (re-fetch even if data exists)"
            />
          </div>

          <MuiButton
            type="submit"
            variant="contained"
            className="bg-slate-700 hover:bg-slate-800"
            disabled={isLoading || selectedBaskets.length === 0}
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {isLoading ? "Queued/Populating..." : "Populate Price History"}
          </MuiButton>
          
          {status === "RUNNING" && (
              <p className="text-sm text-blue-600 animate-pulse mt-2">Job is running in background...</p>
          )}

        </form>
        
        {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                <p>Error: {error}</p>
            </div>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-semibold text-green-900">{result.message}</p>
              <div className="text-sm text-green-700 mt-2">
                <p>Companies processed: <strong>{result.companies_processed}</strong></p>
                <p>Date range: <strong>{result.date_range.start}</strong> to <strong>{result.date_range.end}</strong></p>
              </div>
            </div>

            {result.results.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Results by Market:</h3>
                {result.results.map((item, idx) => (
                  <div
                    key={idx}
                    className={`rounded border p-3 ${
                      item.status === "success"
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <p className="font-semibold">{item.market}</p>
                    <p className="text-sm">
                      Status: <strong>{item.status}</strong> | Companies: <strong>{item.count}</strong>
                    </p>
                    {item.error && (
                      <p className="text-xs text-red-600 mt-1">Error: {item.error}</p>
                    )}
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 cursor-pointer">View tickers</summary>
                      <p className="text-xs text-gray-600 mt-1">{item.tickers.join(", ")}</p>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </FormCardGenerator>
    </div>
  );
}
