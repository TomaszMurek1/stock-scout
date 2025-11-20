import { useState } from "react";
import { Button as MuiButton, Checkbox, FormControlLabel, TextField, CircularProgress } from "@mui/material";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import { toast } from "react-toastify";
import { apiClient } from "@/services/apiClient";

interface SyncResult {
  processed: number;
  updated: number;
  skipped: number;
  metadata_only: number;
  missing_exchange: string[];
  missing_market: string[];
}

export default function AdminSyncMarkets() {
  const [force, setForce] = useState(false);
  const [limit, setLimit] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const payload: { force: boolean; limit?: number } = { force };
      const parsedLimit = Number(limit);
      if (limit && !Number.isNaN(parsedLimit)) {
        payload.limit = parsedLimit;
      }

      const { data } = await apiClient.post<SyncResult>("/admin/sync-company-markets", payload);
      setResult(data);
      toast.success(`Processed ${data.processed} companies`);
    } catch (error: any) {
      console.error("Sync error", error);
      const message = error?.response?.data?.detail || error.message || "Failed to run sync";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <FormCardGenerator
        title="Sync companies with markets"
        subtitle="Fetch exchange metadata from Yahoo Finance and assign markets to companies."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <TextField
              label="Limit"
              placeholder="Process all"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              size="small"
              helperText="Optional: limit how many companies to process in one run"
            />
            <FormControlLabel
              control={<Checkbox checked={force} onChange={(e) => setForce(e.target.checked)} />}
              label="Force update even if market already assigned"
            />
          </div>
          <MuiButton
            type="submit"
            variant="contained"
            className="bg-slate-700 hover:bg-slate-800"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {loading ? "Syncing..." : "Start sync"}
          </MuiButton>
        </form>

        {result && (
          <div className="mt-6 space-y-3 text-sm text-slate-700">
            <p>
              Processed <strong>{result.processed}</strong> companies, updated <strong>{result.updated}</strong>.
              Skipped <strong>{result.skipped}</strong>. Stored Yahoo exchange for <strong>{result.metadata_only}</strong> unresolved companies.
            </p>
            {result.missing_exchange.length > 0 && (
              <div>
                <p className="font-semibold">Missing exchange info</p>
                <p className="break-words text-slate-500">{result.missing_exchange.join(", ")}</p>
              </div>
            )}
            {result.missing_market.length > 0 && (
              <div>
                <p className="font-semibold">Unmapped exchanges</p>
                <p className="break-words text-slate-500">{result.missing_market.join(", ")}</p>
              </div>
            )}
          </div>
        )}
      </FormCardGenerator>
    </div>
  );
}
