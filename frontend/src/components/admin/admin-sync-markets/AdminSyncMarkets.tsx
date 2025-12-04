import { useState, useEffect } from "react";
import { Button as MuiButton, Checkbox, FormControlLabel, TextField, CircularProgress, MenuItem, Select, InputLabel, FormControl, ToggleButton, ToggleButtonGroup } from "@mui/material";
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
  delisted: string[];
  last_id?: number;
}

interface AddResult {
  summary: {
    added: number;
    existing: number;
    failed: number;
    total: number;
  };
  details: Array<{
    ticker: string;
    status: string;
    message?: string;
    name?: string;
  }>;
}

const BATCH_SIZE = 50;

export default function AdminSyncMarkets() {
  // Sync State
  const [force, setForce] = useState(false);
  const [limit, setLimit] = useState<string>(""); // User's total limit
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [batchProgress, setBatchProgress] = useState<string>("");

  // Add Companies State
  const [tickersInput, setTickersInput] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addResult, setAddResult] = useState<AddResult | null>(null);
  const [availableMarkets, setAvailableMarkets] = useState<Record<string, string>>({});
  
  // New: Import Method State
  const [importMethod, setImportMethod] = useState<"tickers" | "market">("tickers");
  const [selectedMarket, setSelectedMarket] = useState<string>("");

  useEffect(() => {
    apiClient.get<Record<string, string>>("/admin/available-markets")
      .then(({ data }) => setAvailableMarkets(data))
      .catch(err => console.error("Failed to fetch markets", err));
  }, []);

  const processSyncBatch = async (
    startId: number | null, 
    accumulatedResult: SyncResult, 
    remainingLimit: number | null
  ) => {
    try {
      const currentLimit = remainingLimit !== null ? Math.min(BATCH_SIZE, remainingLimit) : BATCH_SIZE;
      
      if (remainingLimit !== null && remainingLimit <= 0) {
        setSyncResult(accumulatedResult);
        setSyncLoading(false);
        setBatchProgress("");
        toast.success(`Sync complete. Processed ${accumulatedResult.processed} companies.`);
        return;
      }

      setBatchProgress(`Processing batch (starting from ID: ${startId || 0})... Total processed: ${accumulatedResult.processed}`);

      const payload = { 
        force, 
        limit: currentLimit,
        start_from_id: startId 
      };

      const { data } = await apiClient.post<SyncResult>("/admin/sync-company-markets", payload);

      // Accumulate results
      accumulatedResult.processed += data.processed;
      accumulatedResult.updated += data.updated;
      accumulatedResult.skipped += data.skipped;
      accumulatedResult.metadata_only += data.metadata_only;
      accumulatedResult.missing_exchange.push(...data.missing_exchange);
      accumulatedResult.missing_market.push(...data.missing_market);
      accumulatedResult.delisted.push(...data.delisted);

      if (data.processed > 0 && data.last_id) {
        // Continue to next batch
        const nextRemaining = remainingLimit !== null ? remainingLimit - data.processed : null;
        await processSyncBatch(data.last_id, accumulatedResult, nextRemaining);
      } else {
        // Done
        setSyncResult(accumulatedResult);
        setSyncLoading(false);
        setBatchProgress("");
        toast.success(`Sync complete. Processed ${accumulatedResult.processed} companies.`);
      }
    } catch (error: any) {
      console.error("Sync error", error);
      const message = error?.response?.data?.detail || error.message || "Failed to run sync";
      toast.error(message);
      setSyncLoading(false);
      setBatchProgress("");
      // Show whatever we managed to accumulate
      setSyncResult(accumulatedResult); 
    }
  };

  const handleSyncSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSyncLoading(true);
    setSyncResult(null);
    
    const initialResult: SyncResult = {
      processed: 0, updated: 0, skipped: 0, metadata_only: 0,
      missing_exchange: [], missing_market: [], delisted: []
    };

    const parsedLimit = limit ? Number(limit) : null;
    const userLimit = (parsedLimit && !Number.isNaN(parsedLimit)) ? parsedLimit : null;

    await processSyncBatch(null, initialResult, userLimit);
  };

  const handleAddSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAddLoading(true);
    setAddResult(null);

    try {
      let payload: any = {};
      
      if (importMethod === "market") {
        if (!selectedMarket) {
           toast.warning("Please select a market");
           setAddLoading(false);
           return;
        }
        payload = { market_code: selectedMarket };
      } else {
        if (!tickersInput.trim()) {
           setAddLoading(false);
           return;
        }
        const tickers = tickersInput
          .split(/[\n, ]+/)
          .map(t => t.trim())
          .filter(Boolean);
          
        if (tickers.length === 0) {
          toast.warning("No valid tickers found");
          setAddLoading(false);
          return;
        }
        payload = { tickers };
      }

      const { data } = await apiClient.post<AddResult>("/admin/add-companies", payload);
      setAddResult(data);
      toast.success(`Added ${data.summary.added} companies`);
      
      if (data.summary.added > 0 && importMethod === "tickers") {
        setTickersInput(""); 
      }
    } catch (error: any) {
      console.error("Add companies error", error);
      const message = error?.response?.data?.detail || error.message || "Failed to add companies";
      toast.error(message);
    } finally {
      setAddLoading(false);
    }
  };

  // Transform markets for display
  const marketOptions = Object.entries(availableMarkets).map(([yahooCode, internalCode]) => ({
    label: `${yahooCode} -> ${internalCode}`,
    yahooCode,
    internalCode
  }));

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Section 1: Sync Markets */}
      <FormCardGenerator
        title="Sync companies with markets"
        subtitle="Fetch exchange metadata from Yahoo Finance and assign markets to existing companies."
      >
        <form onSubmit={handleSyncSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <TextField
              label="Total Limit"
              placeholder="Process all"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              size="small"
              helperText="Optional: limit how many companies to process in total"
            />
            <FormControlLabel
              control={<Checkbox checked={force} onChange={(e) => setForce(e.target.checked)} />}
              label="Process all companies (force)"
            />
          </div>
          <MuiButton
            type="submit"
            variant="contained"
            className="bg-slate-700 hover:bg-slate-800"
            disabled={syncLoading}
            startIcon={syncLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {syncLoading ? "Syncing..." : "Start sync"}
          </MuiButton>
          {batchProgress && (
            <div className="text-sm text-blue-600 mt-2 animate-pulse">
              {batchProgress}
            </div>
          )}
        </form>

        {syncResult && (
          <div className="mt-6 space-y-3 text-sm text-slate-700">
            <p>
              Processed <strong>{syncResult.processed}</strong> companies, updated <strong>{syncResult.updated}</strong>.
              Skipped <strong>{syncResult.skipped}</strong>. Stored Yahoo exchange for <strong>{syncResult.metadata_only}</strong> unresolved companies.
            </p>
            {syncResult.missing_exchange.length > 0 && (
              <div>
                <p className="font-semibold">Missing exchange info</p>
                <p className="break-words text-slate-500">{syncResult.missing_exchange.join(", ")}</p>
              </div>
            )}
            {syncResult.missing_market.length > 0 && (
              <div>
                <p className="font-semibold">Unmapped exchanges</p>
                <p className="break-words text-slate-500">{syncResult.missing_market.join(", ")}</p>
              </div>
            )}
            {syncResult.delisted.length > 0 && (
              <div>
                <p className="font-semibold">Marked as delisted</p>
                <p className="break-words text-slate-500">{syncResult.delisted.join(", ")}</p>
              </div>
            )}
          </div>
        )}
      </FormCardGenerator>

      {/* Section 2: Add Companies */}
      <FormCardGenerator
        title="Add New Companies"
        subtitle="Import new companies by ticker or market. Metadata will be fetched from Yahoo Finance."
      >
        <div className="space-y-4">
          <ToggleButtonGroup
            value={importMethod}
            exclusive
            onChange={(_, newVal) => newVal && setImportMethod(newVal)}
            size="small"
            className="mb-2"
          >
            <ToggleButton value="tickers">By Ticker List</ToggleButton>
            <ToggleButton value="market">By Market</ToggleButton>
          </ToggleButtonGroup>

          {importMethod === "tickers" && (
            <>
              <div className="mb-4 p-3 bg-blue-50 rounded-md text-sm text-blue-800">
                <p className="font-semibold mb-1">Supported Yahoo Markets:</p>
                <div className="flex flex-wrap gap-2">
                   {marketOptions.map((m) => (
                     <span key={m.yahooCode} className="bg-white px-2 py-1 rounded border border-blue-100 shadow-sm">
                       {m.yahooCode} <span className="text-gray-400">→</span> {m.internalCode}
                     </span>
                   ))}
                </div>
              </div>

              <TextField
                label="Tickers"
                placeholder="AAPL, MSFT, TSLA..."
                value={tickersInput}
                onChange={(e) => setTickersInput(e.target.value)}
                multiline
                minRows={3}
                fullWidth
                helperText="Enter tickers separated by commas, spaces, or newlines."
              />
            </>
          )}

          {importMethod === "market" && (
            <FormControl fullWidth>
              <InputLabel>Select Market</InputLabel>
              <Select
                value={selectedMarket}
                label="Select Market"
                onChange={(e) => setSelectedMarket(e.target.value)}
              >
                {marketOptions.map((m) => (
                  <MenuItem key={m.yahooCode} value={m.yahooCode}>
                    {m.yahooCode} ({m.internalCode})
                  </MenuItem>
                ))}
              </Select>
              <p className="text-xs text-gray-500 mt-2">
                This will attempt to fetch all tickers for the selected market from an external provider (FMP) and add them to the database.
              </p>
            </FormControl>
          )}

          <MuiButton
            onClick={handleAddSubmit}
            variant="contained"
            className="bg-green-700 hover:bg-green-800"
            disabled={addLoading || (importMethod === "tickers" && !tickersInput.trim()) || (importMethod === "market" && !selectedMarket)}
            startIcon={addLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {addLoading ? "Adding..." : "Add Companies"}
          </MuiButton>
        </div>

        {addResult && (
          <div className="mt-6 space-y-3 text-sm text-slate-700">
            <p>
              <strong>Summary:</strong> Added {addResult.summary.added}, Existing {addResult.summary.existing}, Failed {addResult.summary.failed}.
            </p>
            <div className="max-h-60 overflow-y-auto border rounded p-2 bg-gray-50">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="py-1">Ticker</th>
                    <th className="py-1">Status</th>
                    <th className="py-1">Info</th>
                  </tr>
                </thead>
                <tbody>
                  {addResult.details.map((d, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1 font-mono">{d.ticker}</td>
                      <td className={`py-1 font-semibold ${
                        d.status === "added" ? "text-green-600" : 
                        d.status === "error" ? "text-red-600" : "text-gray-500"
                      }`}>
                        {d.status}
                      </td>
                      <td className="py-1 text-gray-600">
                        {d.name || d.message || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </FormCardGenerator>
    </div>
  );
}
