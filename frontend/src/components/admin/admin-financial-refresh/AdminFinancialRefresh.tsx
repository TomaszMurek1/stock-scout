import { useEffect, useState } from "react";
import { Autocomplete, Button as MuiButton, CircularProgress, TextField } from "@mui/material";
import { toast } from "react-toastify";
import { apiClient } from "@/services/apiClient";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";

interface MarketResult {
  market: string;
  result: unknown;
}

export default function AdminFinancialRefresh() {
  const [marketName, setMarketName] = useState("all");
  const [basketOptions, setBasketOptions] = useState<{ id: number; name: string; type: string }[]>([]);
  const [selectedBaskets, setSelectedBaskets] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MarketResult[] | null>(null);

  useEffect(() => {
    const loadBaskets = async () => {
      try {
        const { data } = await apiClient.get("/baskets");
        setBasketOptions(data || []);
      } catch (error) {
        console.error("Failed to load baskets", error);
        toast.error("Unable to load baskets.");
      }
    };
    loadBaskets();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setResults(null);

    try {
      if (selectedBaskets.length > 0) {
        const { data } = await apiClient.post<{ status: string; results: MarketResult[] }>(
          "/admin/run-financials-baskets",
          { basket_ids: selectedBaskets },
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
          <div className="grid md:grid-cols-2 gap-4">
            <TextField
              label="Market name (optional)"
              placeholder="all"
              value={marketName}
              onChange={(e) => setMarketName(e.target.value)}
              size="small"
              helperText="Sent as query param; backend currently refreshes all markets regardless."
            />
            <Autocomplete
              multiple
              options={basketOptions}
              getOptionLabel={(opt) => `${opt.name} (${opt.type})`}
              value={basketOptions.filter((b) => selectedBaskets.includes(b.id))}
              onChange={(_, vals) => setSelectedBaskets(vals.map((v) => v.id))}
              renderInput={(params) => <TextField {...params} label="Baskets (optional)" size="small" placeholder="Select baskets" />}
            />
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
