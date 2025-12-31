import { useState } from "react";
import { TextField, Button as MuiButton, CircularProgress } from "@mui/material";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import { toast } from "react-toastify";

interface MaterializeDayResult {
  date: string;
  total_value: string;
  by_cash: string;
}

interface MaterializeRangeResult {
  portfolio_id: number;
  points: {
    date: string;
    total_value: string;
  }[];
}

export default function AdminValuationTools() {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
  const [dayForm, setDayForm] = useState({ portfolioId: "", date: "" });
  const [rangeForm, setRangeForm] = useState({ portfolioId: "", start: "", end: "" });
  const [dayLoading, setDayLoading] = useState(false);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [dayResult, setDayResult] = useState<MaterializeDayResult | null>(null);
  const [rangeResult, setRangeResult] = useState<MaterializeRangeResult | null>(null);

  const authHeaders = () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = localStorage.getItem("authToken");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

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
    setDayLoading(true);
    setDayResult(null);

    try {
      const params = new URLSearchParams({
        portfolio_id: dayForm.portfolioId.trim(),
        as_of: dayForm.date,
      });
      const response = await fetch(`${API_URL}/valuation/materialize-day?${params.toString()}`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to materialize day");
      }
      const data = (await response.json()) as MaterializeDayResult;
      setDayResult(data);
      toast.success("Day materialized successfully");
    } catch (error) {
      console.error("materialize-day error:", error);
      toast.error(error instanceof Error ? error.message : "Network error");
    } finally {
      setDayLoading(false);
    }
  };

  const submitRange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rangeForm.portfolioId || !rangeForm.start || !rangeForm.end) {
      toast.error("Portfolio ID, start, and end dates are required");
      return;
    }
    setRangeLoading(true);
    setRangeResult(null);

    try {
      const params = new URLSearchParams({
        portfolio_id: rangeForm.portfolioId.trim(),
        start: rangeForm.start,
        end: rangeForm.end,
      });
      const response = await fetch(
        `${API_URL}/valuation/materialize-range?${params.toString()}`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to materialize range");
      }
      const data = (await response.json()) as MaterializeRangeResult;
      setRangeResult(data);
      toast.success("Range materialized successfully");
    } catch (error) {
      console.error("materialize-range error:", error);
      toast.error(error instanceof Error ? error.message : "Network error");
    } finally {
      setRangeLoading(false);
    }
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
            {dayLoading ? "Processing..." : "Materialize day"}
          </MuiButton>
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
            {rangeLoading ? "Processing..." : "Materialize range"}
          </MuiButton>
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
