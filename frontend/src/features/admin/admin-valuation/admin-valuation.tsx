import { useState } from "react";
import { TextField, Button as MuiButton, CircularProgress } from "@mui/material";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import { toast } from "react-toastify";
import { useScanJob } from "@/hooks/useScanJob";
import { apiClient } from "@/services/apiClient";

interface MaterializeDayResult {
  date: string;
  total_value: string;
  by_cash: string;
  message?: string;
}

interface MaterializeRangeResult {
  portfolio_id: number;
  points: {
    date: string;
    total_value: string;
  }[];
}

export default function AdminValuationTools() {
  const [dayForm, setDayForm] = useState({ portfolioId: "", date: "" });
  const [rangeForm, setRangeForm] = useState({ portfolioId: "", start: "", end: "" });

  const {
      startJob: startDayJob,
      isLoading: dayLoading,
      result: dayResult,
      error: dayError,
      status: dayStatus
  } = useScanJob<MaterializeDayResult>({
      onCompleted: () => toast.success("Day materialized successfully")
  });

  const {
      startJob: startRangeJob,
      isLoading: rangeLoading,
      result: rangeResult,
      error: rangeError,
      status: rangeStatus
  } = useScanJob<MaterializeRangeResult>({
      onCompleted: () => toast.success("Range materialized successfully")
  });


  const handleDayChange = (field: "portfolioId" | "date", value: string) => {
    setDayForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRangeChange = (field: "portfolioId" | "start" | "end", value: string) => {
    setRangeForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitDay = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!dayForm.portfolioId || !dayForm.date) {
      toast.error("Portfolio ID and date are required");
      return;
    }
    
    startDayJob(() => {
        const params = new URLSearchParams({
            portfolio_id: dayForm.portfolioId.trim(),
            as_of: dayForm.date,
        });
        // Note: Generic job system expects POST usually. 
        // The endpoints were defined as POST in backend, so this is correct.
        // We need to pass params in query string as per backend definition, 
        // OR changing backend to accept Body. 
        // Backend: materialize_day(..., portfolio_id: int, as_of: date) -> these are Query params by default in FastAPI if not Pydantic model.
        // Wait, FastAPI with simple args implies Query params if not in path.
        // So `params` should be attached.
        
        return apiClient.post(`/valuation/materialize-day?${params.toString()}`);
    });
  };

  const submitRange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rangeForm.portfolioId || !rangeForm.start || !rangeForm.end) {
      toast.error("Portfolio ID, start, and end dates are required");
      return;
    }

    startRangeJob(() => {
        const params = new URLSearchParams({
            portfolio_id: rangeForm.portfolioId.trim(),
            start: rangeForm.start,
            end: rangeForm.end,
        });
        return apiClient.post(`/valuation/materialize-range?${params.toString()}`);
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <FormCardGenerator
        title="Materialize single day"
        subtitle="Rebuild valuation metrics for a specific portfolio and date."
      >
        <form onSubmit={submitDay} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <TextField
              label="Portfolio ID"
              value={dayForm.portfolioId}
              onChange={(e) => handleDayChange("portfolioId", e.target.value)}
              size="small"
              required
            />
            <TextField
              label="As of date"
              type="date"
              value={dayForm.date}
              onChange={(e) => handleDayChange("date", e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              required
            />
          </div>
          <MuiButton
            type="submit"
            variant="contained"
            className="bg-slate-700 hover:bg-slate-800"
            disabled={dayLoading}
            startIcon={dayLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {dayLoading ? "Queued/Processing..." : "Materialize day"}
          </MuiButton>
            {dayStatus === "RUNNING" && <p className="text-sm text-blue-600 animate-pulse">Running...</p>}
            {dayError && <p className="text-sm text-red-600">{dayError}</p>}
        </form>
        {dayResult && (
          <div className="mt-4 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <p>
              Date: <strong>{dayResult.date}</strong>
            </p>
            <p>
              Total value: <strong>{dayResult.total_value}</strong>
            </p>
            <p>
              Cash balance: <strong>{dayResult.by_cash}</strong>
            </p>
            {dayResult.message && <p className="text-gray-500 italic mt-1">{dayResult.message}</p>}
          </div>
        )}
      </FormCardGenerator>

      <FormCardGenerator
        title="Materialize date range"
        subtitle="Rebuild valuations for a continuous date range. Useful after importing new transactions."
      >
        <form onSubmit={submitRange} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <TextField
              label="Portfolio ID"
              value={rangeForm.portfolioId}
              onChange={(e) => handleRangeChange("portfolioId", e.target.value)}
              size="small"
              required
            />
            <TextField
              label="Start date"
              type="date"
              value={rangeForm.start}
              onChange={(e) => handleRangeChange("start", e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              required
            />
            <TextField
              label="End date"
              type="date"
              value={rangeForm.end}
              onChange={(e) => handleRangeChange("end", e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              required
            />
          </div>
          <MuiButton
            type="submit"
            variant="contained"
            className="bg-slate-700 hover:bg-slate-800"
            disabled={rangeLoading}
            startIcon={rangeLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {rangeLoading ? "Queued/Processing..." : "Materialize range"}
          </MuiButton>
           {rangeStatus === "RUNNING" && <p className="text-sm text-blue-600 animate-pulse">Running...</p>}
           {rangeError && <p className="text-sm text-red-600">{rangeError}</p>}
        </form>
        {rangeResult && (
          <div className="mt-4 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700 space-y-2">
            <p>
              Portfolio: <strong>{rangeResult.portfolio_id}</strong>
            </p>
            <p>
              Days updated: <strong>{rangeResult.points.length}</strong>
            </p>
            {rangeResult.points.length > 0 && (
              <div>
                <p className="font-semibold">Latest point</p>
                <p>
                  {rangeResult.points[rangeResult.points.length - 1].date} —{" "}
                  {rangeResult.points[rangeResult.points.length - 1].total_value}
                </p>
              </div>
            )}
          </div>
        )}
      </FormCardGenerator>
    </div>
  );
}
