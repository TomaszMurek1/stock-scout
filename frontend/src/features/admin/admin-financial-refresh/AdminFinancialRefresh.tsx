import { useState } from "react";
import { Button as MuiButton, CircularProgress, TextField } from "@mui/material";
import { toast } from "react-toastify";
import { apiClient } from "@/services/apiClient";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import BasketChipSelector from "@/components/shared/forms/BasketChipSelector";

interface MarketResult {
  market: string;
  result: unknown;
}

export default function AdminFinancialRefresh() {
  const [marketName, setMarketName] = useState("all");
  const [selectedBaskets, setSelectedBaskets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MarketResult[] | null>(null);



  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setResults(null);

    try {
      if (selectedBaskets.length > 0) {
        const { data } = await apiClient.post<{ status: string; results: MarketResult[] }>(
          "/admin/run-financials-baskets",
          { basket_ids: selectedBaskets.map((id) => Number(id)) },
        );
        setResults(data.results || []);
        toast.success("Financial refresh (baskets) triggered");
      } else {
        const { data } = await apiClient.post<{ status: string; results: MarketResult[] }>(
          "/admin/run-financials-market-update",
          null,
          { params: { market_name: marketName || "all" } },
        );
        setResults(data.results || []);
        toast.success("Financial refresh triggered");
      }
    } catch (error: any) {
      console.error("Financial refresh error", error);
      const message = error?.response?.data?.detail || error.message || "Failed to trigger refresh";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

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
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {loading ? "Refreshing..." : "Start refresh"}
          </MuiButton>
        </form>

        {results && results.length > 0 && (
          <div className="mt-6 space-y-3 text-sm text-slate-700">
            {results.map((item) => (
              <div key={item.market} className="rounded border border-slate-200 bg-white p-3">
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
