import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { GmmaSqueezeChart } from "./gmma-squeeze-chart";
import { IGmmaChartDataPoint } from "./gmma-squeeze-form.types";
import { apiClient } from "@/services/apiClient";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";

/* ── Time range options ──────────────────────────────────────────── */
type RangeKey = "1M" | "3M" | "6M" | "1Y";

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "1M",  label: "1 M",   days: 22 },
  { key: "3M",  label: "3 M",   days: 66 },
  { key: "6M",  label: "6 M",   days: 132 },
  { key: "1Y",  label: "1 Y",   days: 260 },
];

export default function GmmaChartPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const [data, setData] = useState<IGmmaChartDataPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("1Y");

  const activeDays = RANGES.find((r) => r.key === range)!.days;

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    setError(null);

    apiClient
      .get(`/technical-analysis/gmma-squeeze/chart/${ticker}`, {
        params: { days: activeDays },
      })
      .then((res) => setData(res.data.data))
      .catch((err) =>
        setError(err?.response?.data?.detail || "Failed to load chart data")
      )
      .finally(() => setLoading(false));
  }, [ticker, activeDays]);

  return (
    <div data-id="gmma-chart-page" className="container max-w-6xl mx-auto py-6 px-4">
      {/* Navigation links */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/scenarios/gmma-squeeze"
          data-id="btn-back-gmma"
          className="
            inline-flex items-center gap-2
            text-sm text-slate-600 hover:text-slate-900 transition
          "
        >
          <ArrowLeft size={16} />
          Back to GMMA Squeeze
        </Link>

        {ticker && (
          <Link
            to={`/stock-details/${ticker}`}
            data-id="link-stock-details"
            className="
              inline-flex items-center gap-1.5
              text-sm text-indigo-600 hover:text-indigo-800 transition font-medium
            "
          >
            View Stock Details
            <ExternalLink size={14} />
          </Link>
        )}
      </div>

      {/* Chart card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6">
        {/* ── Time range selector ───────────────────────────────── */}
        <div data-id="chart-range-selector" className="flex items-center gap-1 mb-4">
          <span className="text-xs text-slate-500 mr-2 font-medium">Zoom:</span>
          {RANGES.map((r) => (
            <button
              key={r.key}
              data-id={`btn-range-${r.key.toLowerCase()}`}
              onClick={() => setRange(r.key)}
              disabled={loading}
              className={`
                px-3 py-1 rounded-md text-xs font-semibold transition-all
                ${range === r.key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {r.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 className="animate-spin mr-3" size={24} />
            <span className="text-lg">Loading chart for {ticker}...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-red-500 text-lg mb-2">⚠ {error}</p>
            <Link
              to="/scenarios/gmma-squeeze"
              className="text-sm text-indigo-600 hover:underline"
            >
              Go back to scan results
            </Link>
          </div>
        )}

        {data && ticker && <GmmaSqueezeChart data={data} ticker={ticker} />}
      </div>
    </div>
  );
}
