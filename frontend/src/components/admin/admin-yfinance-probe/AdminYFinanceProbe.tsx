import { useMemo, useState } from "react";
import {
  Button as MuiButton,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  TextField,
} from "@mui/material";
import { toast } from "react-toastify";
import { apiClient } from "@/services/apiClient";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SimpleRow = Record<string, string | number | null | undefined>;

interface DebtTrend {
  latest?: number | null;
  previous?: number | null;
  change?: number | null;
  direction?: "up" | "down" | "flat" | string;
}

interface ProbeMetrics {
  total_revenue?: number | null;
  net_income?: number | null;
  eps?: number | null;
  operating_income?: number | null;
  operating_cash_flow?: number | null;
  forecast_revenue_growth_rate?: number | null;
  forecast_eps_growth_rate_short?: number | null;
  forecast_eps_growth_rate_long?: number | null;
  forecast_revision_direction?: string | null;
  return_on_assets?: number | null;
  return_on_invested_capital?: number | null;
  interest_coverage?: number | null;
  cfo_to_total_debt?: number | null;
  total_debt_trend?: DebtTrend | null;
  current_ratio?: number | null;
  debt_to_assets?: number | null;
  ohlson_o_score?: number | null;
  analyst_price_target?: number | null;
  historical_revenue_growth_rate?: number | null;
  shares_outstanding?: number | null;
}

interface StatementBlock {
  income_statement?: SimpleRow[];
  balance_sheet?: SimpleRow[];
  cash_flow?: SimpleRow[];
  earnings?: SimpleRow[];
}

interface ProbeResponse {
  ticker: string;
  fetched_at: string;
  basic?: {
    fast_info?: Record<string, unknown>;
    info?: Record<string, unknown>;
  };
  market_data?: Record<string, SimpleRow[]>;
  statements?: StatementBlock;
  quarterly?: StatementBlock;
  estimates?: Record<string, SimpleRow[]>;
  metrics?: ProbeMetrics;
  options?: Record<string, unknown>;
  news?: { title?: string; link?: string; publisher?: string }[];
  sustainability?: SimpleRow[];
  meta?: { errors?: string[] };
}

const numberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 2,
});

const defaultFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const formatNumber = (value: unknown) => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    if (Math.abs(value) >= 1000) return numberFormatter.format(value);
    return defaultFormatter.format(value);
  }
  return String(value);
};

const formatPercent = (value: unknown) => {
  if (value === null || value === undefined) return "—";
  if (typeof value !== "number") return String(value);
  return percentFormatter.format(value);
};

const renderCellValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") {
    if (Math.abs(value) >= 1000) return numberFormatter.format(value);
    return defaultFormatter.format(value);
  }
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const RecordsTable = ({ title, rows }: { title: string; rows?: SimpleRow[] }) => {
  if (!rows || rows.length === 0) return null;

  const columns = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-medium text-slate-800">{title}</p>
        <span className="text-xs text-slate-500">{rows.length} rows</span>
      </div>
      <div className="overflow-auto border border-slate-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left text-slate-600 font-semibold whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                {columns.map((col) => (
                  <td key={`${idx}-${col}`} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                    {renderCellValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const KeyValueList = ({ data, title }: { data?: Record<string, unknown>; title: string }) => {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="font-medium text-slate-800">{title}</p>
      <div className="grid md:grid-cols-2 gap-3 text-sm">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex items-start justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-slate-600 mr-2">{key}</span>
            <span className="text-slate-800 text-right ml-2 break-all">
              {typeof value === "object" && value !== null ? JSON.stringify(value) : renderCellValue(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MetricsGrid = ({ metrics }: { metrics?: ProbeMetrics }) => {
  if (!metrics) return null;

  const debtTrend = metrics.total_debt_trend;
  const debtTrendText = debtTrend
    ? `${formatNumber(debtTrend.latest)} (${debtTrend.direction || "n/a"}${debtTrend.change ? ` ${formatNumber(debtTrend.change)}` : ""})`
    : "—";
  const hasNetIncome = metrics.net_income !== null && metrics.net_income !== undefined;

  const metricItems = [
    { label: "Total Revenue", value: formatNumber(metrics.total_revenue) },
    { label: "Net Income / EPS", value: hasNetIncome ? `${formatNumber(metrics.net_income)} / ${formatNumber(metrics.eps)}` : "—" },
    { label: "Operating Income (EBIT)", value: formatNumber(metrics.operating_income) },
    { label: "Operating Cash Flow (CFO)", value: formatNumber(metrics.operating_cash_flow) },
    { label: "Forecasted Revenue Growth Rate", value: formatPercent(metrics.forecast_revenue_growth_rate) },
    { label: "Forecasted EPS Growth Rate (1-2Y)", value: formatPercent(metrics.forecast_eps_growth_rate_short) },
    { label: "Forecasted EPS Growth Rate (5Y)", value: formatPercent(metrics.forecast_eps_growth_rate_long) },
    { label: "Forecast Revision Direction", value: metrics.forecast_revision_direction || "—" },
    { label: "Return on Assets (ROA)", value: formatPercent(metrics.return_on_assets) },
    { label: "Return on Invested Capital (ROIC)", value: formatPercent(metrics.return_on_invested_capital) },
    { label: "Interest Coverage", value: formatNumber(metrics.interest_coverage) },
    { label: "CFO to Total Debt", value: formatPercent(metrics.cfo_to_total_debt) },
    { label: "Total Debt Trend", value: debtTrendText },
    { label: "Current Assets / Current Liabilities", value: formatNumber(metrics.current_ratio) },
    { label: "Debt to Assets", value: formatPercent(metrics.debt_to_assets) },
    { label: "Ohlson Indicator Score", value: formatNumber(metrics.ohlson_o_score) },
    { label: "Analyst Price Target (PT)", value: formatNumber(metrics.analyst_price_target) },
    { label: "Historical Revenue Growth", value: formatPercent(metrics.historical_revenue_growth_rate) },
    { label: "Shares Outstanding (fast_info)", value: formatNumber(metrics.shares_outstanding) },
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
      {metricItems.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
          <p className="text-lg font-semibold text-slate-800 mt-1">{item.value}</p>
        </div>
      ))}
    </div>
  );
};

export default function AdminYFinanceProbe() {
  const [ticker, setTicker] = useState("");
  const [includeQuarterly, setIncludeQuarterly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProbeResponse | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ticker.trim()) {
      toast.error("Please enter a ticker symbol");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data } = await apiClient.post<ProbeResponse>("/admin/yfinance-probe", {
        ticker: ticker.trim(),
        include_quarterly: includeQuarterly,
      });
      setResult(data);
      toast.success(`Fetched yfinance snapshot for ${ticker.trim().toUpperCase()}`);
    } catch (error: any) {
      console.error("yfinance probe error", error);
      const message = error?.response?.data?.detail || error.message || "Failed to fetch yfinance data";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const hasQuarterly = useMemo(() => {
    if (!result?.quarterly) return false;
    return Boolean(
      result.quarterly.income_statement?.length ||
        result.quarterly.balance_sheet?.length ||
        result.quarterly.cash_flow?.length,
    );
  }, [result]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <FormCardGenerator
        title="Inspect yfinance payload"
        subtitle="Quickly pull what yfinance returns for a ticker, including quarterly statements and derived ratios."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <TextField
              label="Ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              size="small"
              placeholder="AAPL, MSFT, ALE.WA..."
              required
            />
            <FormControlLabel
              control={<Checkbox checked={includeQuarterly} onChange={(e) => setIncludeQuarterly(e.target.checked)} />}
              label="Include quarterly data"
            />
          </div>
          <MuiButton
            type="submit"
            variant="contained"
            className="bg-slate-700 hover:bg-slate-800"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {loading ? "Fetching..." : "Fetch snapshot"}
          </MuiButton>
        </form>
        {result?.meta?.errors && result.meta.errors.length > 0 && (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-semibold mb-1">Warnings</p>
            <ul className="list-disc list-inside space-y-1">
              {result.meta.errors.map((err, idx) => (
                <li key={`${err}-${idx}`}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </FormCardGenerator>

      {result && (
        <div className="space-y-6">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-xl">Derived metrics</CardTitle>
              <CardDescription className="text-slate-600">
                Pulled at {new Date(result.fetched_at).toLocaleString()} for {result.ticker}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MetricsGrid metrics={result.metrics} />
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-xl">Annual financial statements</CardTitle>
              <CardDescription className="text-slate-600">
                Data is trimmed to the most recent periods for readability.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RecordsTable title="Income statement" rows={result.statements?.income_statement} />
              <RecordsTable title="Balance sheet" rows={result.statements?.balance_sheet} />
              <RecordsTable title="Cash flow" rows={result.statements?.cash_flow} />
            </CardContent>
          </Card>

          {hasQuarterly && (
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-xl">Quarterly statements</CardTitle>
                <CardDescription className="text-slate-600">
                  Includes quarterly income, balance sheet, cash flow and reported earnings where available.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RecordsTable title="Quarterly income" rows={result.quarterly?.income_statement} />
                <RecordsTable title="Quarterly balance sheet" rows={result.quarterly?.balance_sheet} />
                <RecordsTable title="Quarterly cash flow" rows={result.quarterly?.cash_flow} />
                <RecordsTable title="Quarterly earnings" rows={result.quarterly?.earnings} />
              </CardContent>
            </Card>
          )}

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-xl">Forecasts & revisions</CardTitle>
              <CardDescription className="text-slate-600">
                Analyst outlook and revision data from yfinance to help decide which fields to persist.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RecordsTable title="Earnings dates" rows={result.estimates?.earnings_dates as SimpleRow[]} />
              <RecordsTable title="Earnings estimate" rows={result.estimates?.earnings_estimate as SimpleRow[]} />
              <RecordsTable title="Revenue estimate" rows={result.estimates?.revenue_estimate as SimpleRow[]} />
              <RecordsTable title="EPS trend" rows={result.estimates?.eps_trend as SimpleRow[]} />
              <RecordsTable title="EPS revisions" rows={result.estimates?.eps_revisions as SimpleRow[]} />
              <RecordsTable title="Growth estimates" rows={result.estimates?.growth_estimates as SimpleRow[]} />
              <RecordsTable title="Analyst price targets" rows={result.estimates?.analyst_price_targets as SimpleRow[]} />
              <RecordsTable title="Recommendations" rows={result.estimates?.recommendations as SimpleRow[]} />
              <RecordsTable title="Upgrades / downgrades" rows={result.estimates?.upgrades_downgrades as SimpleRow[]} />
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-xl">Market data & fast info</CardTitle>
              <CardDescription className="text-slate-600">
                Snapshot of raw outputs such as fast_info, dividends, splits, and recent history samples.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <KeyValueList data={result.basic?.fast_info} title="fast_info" />
              <KeyValueList data={result.basic?.info} title="info (deprecated)" />
              <RecordsTable title="1 month history (sample)" rows={result.market_data?.one_month_history} />
              <RecordsTable title="Dividends" rows={result.market_data?.dividends} />
              <RecordsTable title="Splits" rows={result.market_data?.splits} />
              <RecordsTable title="Shares" rows={result.market_data?.shares} />
              <RecordsTable title="Corporate actions" rows={result.market_data?.actions} />
              <RecordsTable title="Sustainability" rows={result.sustainability} />
            </CardContent>
          </Card>

          {result.news && result.news.length > 0 && (
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-xl">Recent news</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.news.map((item, idx) => (
                  <div key={`${item.title}-${idx}`} className="border-b border-slate-200 pb-2 last:border-none">
                    <p className="font-medium text-slate-800">{item.title}</p>
                    <p className="text-sm text-slate-600">
                      {item.publisher ? `${item.publisher} • ` : ""}
                      {item.link ? (
                        <a href={item.link} className="text-slate-700 underline" target="_blank" rel="noreferrer">
                          {item.link}
                        </a>
                      ) : null}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
