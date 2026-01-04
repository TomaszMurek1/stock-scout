import { useState, useMemo } from "react";
import { Button as MuiButton, CircularProgress, TextField } from "@mui/material";
import { toast } from "react-toastify";
import { apiClient } from "@/services/apiClient";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import BasketChipSelector from "@/components/shared/forms/BasketChipSelector";
import { useScanJob } from "@/hooks/useScanJob";

interface MarketResult {
  market: string;
  result: unknown;
}

export default function AdminFinancialRefresh() {
  const [marketName, setMarketName] = useState("all");
  const [selectedBaskets, setSelectedBaskets] = useState<string[]>([]);
  
  const { startJob, isLoading, result, error, status } = useScanJob<{results: MarketResult[]}>({
     onCompleted: () => toast.success("Refreshed successfully"),
     onError: (err) => toast.error(err)
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // We can use startJob for both. It resets state on each call. 
    // This is fine since we likely won't run both simultaneously from the same component instance 
    // (UI blocks while loading mostly, or user clicks one then waits).
    
    if (selectedBaskets.length > 0) {
        startJob(() => 
            apiClient.post("/admin/run-financials-baskets", { 
                basket_ids: selectedBaskets.map((id) => Number(id)) 
            })
        );
    } else {
        startJob(() => 
            apiClient.post("/admin/run-financials-market-update", null, { 
                params: { market_name: marketName || "all" } 
            })
        );
    }
  };

  const displayResults = result?.results || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <FormCardGenerator
        title="Refresh financial data"
        subtitle="Trigger yfinance financial and quarterly snapshots for all markets. Uses stored data to avoid duplicates."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-1 gap-4">
            <TextField
              label="Market name (optional)"
              placeholder="all"
              value={marketName}
              onChange={(e) => setMarketName(e.target.value)}
              size="small"
              helperText="Sent as query param; backend currently refreshes all markets regardless. Leave empty and select baskets below for targeted refresh."
            />
            <div className="mt-4">
              <BasketChipSelector
                value={selectedBaskets}
                onChange={setSelectedBaskets}
                label="Select Baskets (optional)"
                description="Choose baskets to refresh financial data for specific companies."
              />
            </div>
          </div>
          <MuiButton
            type="submit"
            variant="contained"
            className="bg-slate-700 hover:bg-slate-800"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {isLoading ? "Queued/Running..." : "Start refresh"}
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

        {displayResults.length > 0 && (
          <div className="mt-6 space-y-3 text-sm text-slate-700">
            {displayResults.map((item, idx) => (
              <div key={idx} className="rounded border border-slate-200 bg-white p-3">
                <p className="font-semibold">{item.market}</p>
                <pre className="whitespace-pre-wrap break-words text-xs text-slate-600">
                  {JSON.stringify(item.result, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </FormCardGenerator>
    </div>
  );
}
