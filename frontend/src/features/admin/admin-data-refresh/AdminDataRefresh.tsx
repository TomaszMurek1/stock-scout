import { useState } from "react";
import { Button as MuiButton, CircularProgress } from "@mui/material";
import { toast } from "react-toastify";
import { apiClient } from "@/services/apiClient";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import BasketChipSelector from "@/components/shared/forms/BasketChipSelector";
import { useScanJob } from "@/hooks/useScanJob";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MarketResult {
  market: string;
  count?: number;
  total_tickers?: number;
  inserted?: number;
  updated?: number;
  status: string;
  result?: unknown;
  error?: string;
}

interface RefreshResponse {
  total_tickers?: number;
  results: MarketResult[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminDataRefresh() {
  /* ---- Price state ---- */
  const [priceBaskets, setPriceBaskets] = useState<string[]>([]);
  const priceAllJob = useScanJob<RefreshResponse>({
    onCompleted: (d) =>
      toast.success(`Price refresh done — ${d.total_tickers ?? "all"} tickers`),
    onError: (e) => toast.error(e),
  });
  const priceBasketsJob = useScanJob<RefreshResponse>({
    onCompleted: () => toast.success("Basket price refresh done"),
    onError: (e) => toast.error(e),
  });

  /* ---- Fundamentals state ---- */
  const [fundBaskets, setFundBaskets] = useState<string[]>([]);
  const fundAllJob = useScanJob<RefreshResponse>({
    onCompleted: (d) =>
      toast.success(`Fundamentals done — ${d.total_tickers ?? "all"} tickers`),
    onError: (e) => toast.error(e),
  });
  const fundBasketsJob = useScanJob<RefreshResponse>({
    onCompleted: () => toast.success("Basket fundamentals refresh done"),
    onError: (e) => toast.error(e),
  });

  /* ---- Helpers: wrap API call to detect already-running jobs ---- */
  const withDuplicateCheck = (apiCall: () => Promise<any>) => {
    return async () => {
      const response = await apiCall();
      if (response.data.already_running) {
        toast.info("A refresh of this type is already running — tracking the existing job.");
      }
      return response;
    };
  };

  /* ---- Handlers ---- */
  const refreshAllPrices = () =>
    priceAllJob.startJob(withDuplicateCheck(() => apiClient.post("/n8n/admin-daily-prices")));

  const refreshBasketPrices = () => {
    if (priceBaskets.length === 0) {
      toast.error("Select at least one basket");
      return;
    }
    priceBasketsJob.startJob(
      withDuplicateCheck(() =>
        apiClient.post("/admin/populate-price-history", {
          basket_ids: priceBaskets.map(Number),
        })
      )
    );
  };

  const refreshAllFundamentals = () =>
    fundAllJob.startJob(withDuplicateCheck(() => apiClient.post("/n8n/admin-daily-fundamentals")));

  const refreshBasketFundamentals = () => {
    if (fundBaskets.length === 0) {
      toast.error("Select at least one basket");
      return;
    }
    fundBasketsJob.startJob(
      withDuplicateCheck(() =>
        apiClient.post("/admin/run-financials-baskets", {
          basket_ids: fundBaskets.map(Number),
        })
      )
    );
  };

  const anyPriceLoading = priceAllJob.isLoading || priceBasketsJob.isLoading;
  const anyFundLoading = fundAllJob.isLoading || fundBasketsJob.isLoading;

  return (
    <div data-id="admin-data-refresh-page" className="container mx-auto px-4 py-8 space-y-8">

      {/* ============================================================ */}
      {/*  PRICE DATA                                                   */}
      {/* ============================================================ */}
      <FormCardGenerator
        title="Price Data"
        subtitle="Refresh OHLCV + SMA price data. 'Refresh All' updates every company in the DB (same as the n8n daily cron). Use basket selection for a targeted refresh."
      >
        <div className="space-y-5">
          {/* Refresh All */}
          <div className="flex items-center gap-3">
            <MuiButton
              data-id="btn-price-all"
              variant="contained"
              className="bg-slate-700 hover:bg-slate-800"
              disabled={anyPriceLoading}
              onClick={refreshAllPrices}
              startIcon={priceAllJob.isLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {priceAllJob.isLoading ? "Running…" : "Refresh All Companies"}
            </MuiButton>
          </div>

          <JobFeedback job={priceAllJob} />

          {/* Basket-targeted */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
              Or target specific baskets
            </p>
            <BasketChipSelector
              value={priceBaskets}
              onChange={setPriceBaskets}
              label="Select Baskets"
              description="Only companies in the selected baskets will be refreshed."
            />
            <MuiButton
              data-id="btn-price-baskets"
              variant="outlined"
              className="border-slate-600 text-slate-700"
              disabled={anyPriceLoading || priceBaskets.length === 0}
              onClick={refreshBasketPrices}
              startIcon={priceBasketsJob.isLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {priceBasketsJob.isLoading ? "Running…" : "Refresh Selected Baskets"}
            </MuiButton>
            <JobFeedback job={priceBasketsJob} />
          </div>
        </div>
      </FormCardGenerator>

      {/* ============================================================ */}
      {/*  FUNDAMENTAL DATA                                             */}
      {/* ============================================================ */}
      <FormCardGenerator
        title="Fundamental Data"
        subtitle="Refresh annual & quarterly financial snapshots. Smart skip logic avoids redundant API calls (80-day quarterly / 350-day annual thresholds)."
      >
        <div className="space-y-5">
          {/* Refresh All */}
          <div className="flex items-center gap-3">
            <MuiButton
              data-id="btn-fund-all"
              variant="contained"
              className="bg-slate-700 hover:bg-slate-800"
              disabled={anyFundLoading}
              onClick={refreshAllFundamentals}
              startIcon={fundAllJob.isLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {fundAllJob.isLoading ? "Running…" : "Refresh All Companies"}
            </MuiButton>
          </div>

          <JobFeedback job={fundAllJob} />

          {/* Basket-targeted */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
              Or target specific baskets
            </p>
            <BasketChipSelector
              value={fundBaskets}
              onChange={setFundBaskets}
              label="Select Baskets"
              description="Only companies in the selected baskets will be refreshed."
            />
            <MuiButton
              data-id="btn-fund-baskets"
              variant="outlined"
              className="border-slate-600 text-slate-700"
              disabled={anyFundLoading || fundBaskets.length === 0}
              onClick={refreshBasketFundamentals}
              startIcon={fundBasketsJob.isLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {fundBasketsJob.isLoading ? "Running…" : "Refresh Selected Baskets"}
            </MuiButton>
            <JobFeedback job={fundBasketsJob} />
          </div>
        </div>
      </FormCardGenerator>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared feedback component                                          */
/* ------------------------------------------------------------------ */

interface JobState {
  isLoading: boolean;
  status: string | null;
  error: string | null;
  result: RefreshResponse | null;
}

function JobFeedback({ job }: { job: JobState }) {
  return (
    <>
      {job.status === "RUNNING" && (
        <p className="text-sm text-blue-600 animate-pulse">
          Job is running in background…
        </p>
      )}

      {job.error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md border border-red-200 text-sm">
          Error: {job.error}
        </div>
      )}

      {job.result && job.result.results.length > 0 && (
        <div className="space-y-2 text-sm text-slate-700">
          {job.result.results.map((item, idx) => (
            <div
              key={idx}
              className={`rounded border p-3 ${
                item.status === "success"
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <p className="font-semibold">{item.market}</p>
              <p className="text-xs text-slate-600">
                Status: <strong>{item.status}</strong>
                {item.count != null && (
                  <> | Tickers: <strong>{item.count}</strong></>
                )}
                {item.total_tickers != null && (
                  <> | Total: <strong>{item.total_tickers}</strong></>
                )}
                {item.inserted != null && (
                  <> | Inserted: <strong>{item.inserted}</strong></>
                )}
                {item.updated != null && (
                  <> | Updated: <strong>{item.updated}</strong></>
                )}
              </p>
              {item.result != null && (
                <pre className="whitespace-pre-wrap break-words text-xs text-slate-500 mt-1">
                  {JSON.stringify(item.result, null, 2)}
                </pre>
              )}
              {item.error && (
                <p className="text-xs text-red-600 mt-1">Error: {item.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
