import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  Area,
  ReferenceLine,
} from "recharts";
import { IGmmaChartDataPoint } from "./gmma-squeeze-form.types";

/* ── Colorblind-safe palette (high luminance contrast) ───────────── */
const CB = {
  close:     "#000000",
  sma200:    "#E69F00",
  shortBand: "#D55E00",
  longBand:  "#56B4E9",
  trendLine: "#009E73",
} as const;

const CB_FILL = {
  shortBand: "rgba(213, 94, 0, 0.22)",
  longBand:  "rgba(86, 180, 233, 0.22)",
} as const;

const DASH = {
  close:     undefined,
  sma200:    "10 4",
  shortBand: undefined,
  longBand:  "4 2",
  trendLine: "6 3 2 3",
} as const;

/* ── Series definitions ──────────────────────────────────────────── */
type SeriesKey = "close" | "sma200" | "shortBand" | "longBand" | "trendLine";

interface SeriesDef {
  key: SeriesKey;
  label: string;
  color: string;
  fill?: string;
  dash?: string;
  isBand?: boolean;
}

const SERIES: SeriesDef[] = [
  { key: "close",     label: "Close Price",              color: CB.close,     dash: DASH.close },
  { key: "sma200",    label: "SMA 200",                  color: CB.sma200,    dash: DASH.sma200 },
  { key: "shortBand", label: "Short-term Band (Traders)", color: CB.shortBand, fill: CB_FILL.shortBand, isBand: true },
  { key: "longBand",  label: "Long-term Band (Investors)",color: CB.longBand,  fill: CB_FILL.longBand,  dash: DASH.longBand, isBand: true },
  { key: "trendLine", label: "Trend Line",               color: CB.trendLine, dash: DASH.trendLine },
];

/* ── Constants ───────────────────────────────────────────────────── */
const SYNC_ID = "gmma-sync";
const Y_AXIS_WIDTH = 65;
const CHART_MARGIN = { top: 4, right: 25, left: 15, bottom: 0 };

const monthAbbr = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/* ── Shared X-axis (hidden) ──────────────────────────────────────── */
const HiddenXAxis: React.FC<{ monthTicks: number[]; formatter: (i: number) => string }> = ({ monthTicks, formatter }) => (
  <XAxis
    dataKey="index"
    type="number"
    domain={["dataMin", "dataMax"]}
    ticks={monthTicks}
    tickFormatter={formatter}
    axisLine={{ strokeOpacity: 0.3 }}
    tickLine={false}
    tick={false}
    height={0}
  />
);

/* ── Shared X-axis (visible, bottom chart) ───────────────────────── */
const VisibleXAxis: React.FC<{ monthTicks: number[]; formatter: (i: number) => string }> = ({ monthTicks, formatter }) => (
  <XAxis
    dataKey="index"
    type="number"
    domain={["dataMin", "dataMax"]}
    ticks={monthTicks}
    tickFormatter={formatter}
    axisLine={{ strokeOpacity: 0.3 }}
    tickLine={false}
    tick={{ fontSize: 11 }}
  />
);

/* ── Tooltips ────────────────────────────────────────────────────── */
const getDateLabel = (payload: any[]): string => {
  const pt = payload?.[0]?.payload;
  return pt?.date || "";
};

const CustomTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const seen = new Set<string>();
  return (
    <div className="bg-white/95 backdrop-blur p-3 border border-slate-200 rounded-lg shadow-lg text-xs min-w-[160px]">
      <p className="font-bold text-slate-700 mb-1.5 border-b border-slate-100 pb-1">{getDateLabel(payload)}</p>
      {payload.map((p: any, i: number) => {
        if (p.value == null || seen.has(p.name)) return null;
        seen.add(p.name);
        return (
          <p key={i} style={{ color: p.stroke || p.fill }} className="leading-relaxed">
            <span className="font-medium">{p.name}:</span> {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
          </p>
        );
      })}
    </div>
  );
};

const IndicatorTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const seen = new Set<string>();
  return (
    <div className="bg-white/95 backdrop-blur p-2.5 border border-slate-200 rounded-lg shadow-lg text-xs min-w-[130px]">
      <p className="font-semibold text-slate-600 mb-1 border-b border-slate-100 pb-0.5">{getDateLabel(payload)}</p>
      {payload.map((p: any, i: number) => {
        if (p.value == null || p.value === 0 || seen.has(p.name)) return null;
        seen.add(p.name);
        return (
          <p key={i} style={{ color: p.stroke || p.fill }} className="leading-relaxed">
            <span className="font-medium">{p.name}:</span> {typeof p.value === "number" ? p.value.toFixed(2) : p.value}%
          </p>
        );
      })}
    </div>
  );
};

/* ── Chart guide ─────────────────────────────────────────────────── */
const ChartGuide: React.FC<{ open: boolean; onToggle: () => void }> = ({ open, onToggle }) => (
  <div className="mb-3">
    <button data-id="btn-chart-guide" onClick={onToggle}
      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1">
      <span className="text-base leading-none">{open ? "▾" : "▸"}</span>
      {open ? "Hide" : "Show"} chart guide
    </button>
    {open && (
      <div data-id="chart-guide" className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 bg-slate-50 rounded-lg p-4 border border-slate-200">
        <GCard color={CB.shortBand} fill={CB_FILL.shortBand} title="Short-term Band (Traders)" lines={["Fast EMAs (3-15d) — trader sentiment.", "Narrow → agreement. Wide → divergence."]} />
        <GCard color={CB.longBand} fill={CB_FILL.longBand} title="Long-term Band (Investors)" lines={["Slow EMAs (30-60d) — investor sentiment.", "Price must cross this for a true trend change."]} />
        <GCard color={CB.trendLine} title="Trend Line" dash="dashed" lines={["Longest EMA — overall market trend."]} />
        <div className="bg-white rounded-md p-3 border border-slate-200">
          <p className="font-semibold text-slate-700 mb-1.5">🔄 Reversal Signals</p>
          <ul className="space-y-0.5 list-none text-slate-600">
            <li>• <strong>Squeeze:</strong> Bands narrow & converge → breakout.</li>
            <li>• <strong>Short crosses Long:</strong> Trend reversal.</li>
            <li>• <strong>Bands widen:</strong> Trend gaining momentum.</li>
          </ul>
        </div>
      </div>
    )}
  </div>
);

const GCard: React.FC<{ color: string; fill?: string; title: string; lines: string[]; dash?: string }> = ({ color, fill, title, lines, dash }) => (
  <div className="bg-white rounded-md p-3 border border-slate-200">
    <div className="flex items-center gap-2 mb-1.5">
      {fill ? <span className="w-4 h-3 rounded-sm inline-block border" style={{ background: fill, borderColor: color }} />
             : <span className="w-4 h-0 inline-block" style={{ borderBottom: `2px ${dash || "solid"} ${color}` }} />}
      <span className="font-semibold text-slate-700">{title}</span>
    </div>
    <ul className="space-y-0.5 list-none">{lines.map((l, i) => <li key={i}>• {l}</li>)}</ul>
  </div>
);

/* ── Range Input for band width thresholds ───────────────────────── */
interface BandRange {
  min: number;
  max: number;
}

interface SignalFilter {
  short: BandRange;
  long: BandRange;
}

const EMPTY_RANGE: BandRange = { min: 0, max: 0 };
const EMPTY_FILTER: SignalFilter = { short: { ...EMPTY_RANGE }, long: { ...EMPTY_RANGE } };

function inRange(value: number, range: BandRange): boolean {
  if (range.min === 0 && range.max === 0) return true;
  if (range.min > 0 && value < range.min) return false;
  if (range.max > 0 && value > range.max) return false;
  return true;
}

const RangeInput: React.FC<{
  label: string; color: string; fill: string;
  range: BandRange; maxVal: number;
  onMin: (v: number) => void; onMax: (v: number) => void;
}> = ({ label, color, fill, range, maxVal, onMin, onMax }) => (
  <div className="bg-slate-50 rounded-md p-2 border border-slate-100">
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="w-3 h-2 rounded-sm inline-block" style={{ background: fill, border: `1px solid ${color}` }} />
      <span className="text-[11px] font-semibold" style={{ color }}>{label}</span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="text-[10px] text-slate-400 block mb-0.5">Min %</label>
        <input type="number" min={0} max={maxVal} step={0.1}
          value={range.min || ""}
          placeholder="OFF"
          onChange={(e) => onMin(parseFloat(e.target.value) || 0)}
          className="w-full text-xs px-1.5 py-1 border border-slate-200 rounded bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
      </div>
      <div>
        <label className="text-[10px] text-slate-400 block mb-0.5">Max %</label>
        <input type="number" min={0} max={maxVal} step={0.1}
          value={range.max || ""}
          placeholder="OFF"
          onChange={(e) => onMax(parseFloat(e.target.value) || 0)}
          className="w-full text-xs px-1.5 py-1 border border-slate-200 rounded bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
      </div>
    </div>
    <p className="text-[9px] text-slate-400 mt-1">0–{maxVal.toFixed(1)}% · empty = OFF</p>
  </div>
);

/* ── Strategy simulation ─────────────────────────────────────────── */
const COMMISSION = 0.005; // 0.5%
const INITIAL_CAPITAL = 10000;

interface StrategyResult {
  name: string;
  finalValue: number;
  returnPct: number;
  trades: number;
  description: string;
}

interface Trade {
  type: "BUY" | "SELL";
  date: string;
  price: number;
  shares: number;
  cash: number;
  portfolioValue: number;
}

function simulateStrategies(
  data: IGmmaChartDataPoint[],
  buyFilter: SignalFilter,
  sellFilter: SignalFilter,
  buyConfirmDays: number = 0,
  sellConfirmDays: number = 0,
): { results: StrategyResult[]; trades: Trade[] } {
  if (data.length < 2) return { results: [], trades: [] };

  const firstClose = data[0].close;
  const lastClose = data[data.length - 1].close;

  const sharesHeld = INITIAL_CAPITAL / firstClose;
  const holdFinal = sharesHeld * lastClose;

  let cash = INITIAL_CAPITAL;
  let shares = 0;
  let inPosition = false;
  let tradeCount = 0;
  const tradeLog: Trade[] = [];

  // Confirmation counters: track how many consecutive days the signal has been active
  let buyCounter = 0;
  let sellCounter = 0;

  for (let i = 1; i < data.length; i++) {
    const d = data[i];
    const mid = d.close || 1;
    const shortMid = (d.czerw_top + d.czerw_bot) / 2;
    const longMid = (d.nieb_top + d.nieb_bot) / 2;
    const spread = shortMid - longMid;
    const shortWidth = ((d.czerw_top - d.czerw_bot) / mid) * 100;
    const longWidth = ((d.nieb_top - d.nieb_bot) / mid) * 100;

    const buySignalActive = spread >= 0
      && inRange(shortWidth, buyFilter.short)
      && inRange(longWidth, buyFilter.long);

    const sellSignalActive = spread < 0
      && inRange(shortWidth, sellFilter.short)
      && inRange(longWidth, sellFilter.long);

    // Update confirmation counters
    buyCounter = buySignalActive ? buyCounter + 1 : 0;
    sellCounter = sellSignalActive ? sellCounter + 1 : 0;

    // BUY: signal held for enough consecutive days
    if (!inPosition && buyCounter >= buyConfirmDays + 1) {
      const costAfterCommission = cash * (1 - COMMISSION);
      shares = costAfterCommission / d.close;
      tradeCount++;
      tradeLog.push({ type: "BUY", date: d.date, price: d.close, shares, cash: 0, portfolioValue: shares * d.close });
      cash = 0;
      inPosition = true;
      buyCounter = 0; // reset after trade
    }
    // SELL: signal held for enough consecutive days
    else if (inPosition && sellCounter >= sellConfirmDays + 1) {
      const proceeds = shares * d.close * (1 - COMMISSION);
      tradeLog.push({ type: "SELL", date: d.date, price: d.close, shares, cash: proceeds, portfolioValue: proceeds });
      cash = proceeds;
      shares = 0;
      tradeCount++;
      inPosition = false;
      sellCounter = 0; // reset after trade
    }
  }

  const gmmaFinal = inPosition ? shares * lastClose : cash;

  return {
    results: [
      {
        name: "Buy & Hold",
        finalValue: holdFinal,
        returnPct: ((holdFinal - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100,
        trades: 1,
        description: `Buy at ${firstClose.toFixed(2)} on day 1, hold until end`,
      },
      {
        name: "GMMA Signal",
        finalValue: gmmaFinal,
        returnPct: ((gmmaFinal - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100,
        trades: tradeCount,
        description: `Buy/sell on Short↔Long crossover${buyConfirmDays > 0 || sellConfirmDays > 0 ? ` (confirm: ${buyConfirmDays}d buy / ${sellConfirmDays}d sell)` : ""}. 0.5% commission.`,
      },
    ],
    trades: tradeLog,
  };
}

/* ── Brute-force optimizer ────────────────────────────────────────── */
interface OptResult {
  buyFilter: SignalFilter;
  sellFilter: SignalFilter;
  buyConfirmDays: number;
  sellConfirmDays: number;
  returnPct: number;
  trades: number;
}

function findBestStrategy(
  data: IGmmaChartDataPoint[],
  maxShortWidth: number,
  maxLongWidth: number,
): OptResult {
  const STEP = 0.5;
  const shortSteps: number[] = [0];
  const longSteps: number[] = [0];
  for (let v = STEP; v <= maxShortWidth + 0.01; v += STEP) shortSteps.push(Math.round(v * 10) / 10);
  for (let v = STEP; v <= maxLongWidth + 0.01; v += STEP) longSteps.push(Math.round(v * 10) / 10);
  const confirmSteps = [0, 1, 2, 3, 4, 5, 7, 10];

  let best: OptResult = {
    buyFilter: { short: { min: 0, max: 0 }, long: { min: 0, max: 0 } },
    sellFilter: { short: { min: 0, max: 0 }, long: { min: 0, max: 0 } },
    buyConfirmDays: 0, sellConfirmDays: 0,
    returnPct: -Infinity,
    trades: 0,
  };

  // Pass 1: Search buy-side filters + buy confirm days
  for (const bcd of confirmSteps) {
    for (const bsMin of shortSteps) {
      for (const bsMax of shortSteps) {
        if (bsMax > 0 && bsMax < bsMin) continue;
        for (const blMin of longSteps) {
          for (const blMax of longSteps) {
            if (blMax > 0 && blMax < blMin) continue;
            const buyF: SignalFilter = { short: { min: bsMin, max: bsMax }, long: { min: blMin, max: blMax } };
            const sellF: SignalFilter = { short: { min: 0, max: 0 }, long: { min: 0, max: 0 } };
            const sim = simulateStrategies(data, buyF, sellF, bcd, 0);
            const gmma = sim.results[1];
            if (gmma && gmma.trades > 0 && gmma.returnPct > best.returnPct) {
              best = { buyFilter: buyF, sellFilter: sellF, buyConfirmDays: bcd, sellConfirmDays: 0, returnPct: gmma.returnPct, trades: gmma.trades };
            }
          }
        }
      }
    }
  }

  // Pass 2: Search sell-side filters + sell confirm days with best buy params
  for (const scd of confirmSteps) {
    for (const ssMin of shortSteps) {
      for (const ssMax of shortSteps) {
        if (ssMax > 0 && ssMax < ssMin) continue;
        for (const slMin of longSteps) {
          for (const slMax of longSteps) {
            if (slMax > 0 && slMax < slMin) continue;
            const sellF: SignalFilter = { short: { min: ssMin, max: ssMax }, long: { min: slMin, max: slMax } };
            const sim = simulateStrategies(data, best.buyFilter, sellF, best.buyConfirmDays, scd);
            const gmma = sim.results[1];
            if (gmma && gmma.trades > 0 && gmma.returnPct > best.returnPct) {
              best = { ...best, sellFilter: sellF, sellConfirmDays: scd, returnPct: gmma.returnPct, trades: gmma.trades };
            }
          }
        }
      }
    }
  }

  return best;
}

/* ══════════════════════════════════════════════════════════════════ */
/* ── Main component ──────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════ */

interface GmmaSqueezeChartProps {
  data: IGmmaChartDataPoint[];
  ticker: string;
}

export const GmmaSqueezeChart: React.FC<GmmaSqueezeChartProps> = ({ data, ticker }) => {
  const [guideOpen, setGuideOpen] = useState(false);
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    close: true, sma200: true, shortBand: true, longBand: true, trendLine: true,
  });
  const [buyFilter, setBuyFilter] = useState<SignalFilter>({ ...EMPTY_FILTER, short: { ...EMPTY_RANGE }, long: { ...EMPTY_RANGE } });
  const [sellFilter, setSellFilter] = useState<SignalFilter>({ ...EMPTY_FILTER, short: { ...EMPTY_RANGE }, long: { ...EMPTY_RANGE } });
  const [buyConfirmDays, setBuyConfirmDays] = useState(0);
  const [sellConfirmDays, setSellConfirmDays] = useState(0);
  const [optimizing, setOptimizing] = useState(false);
  const [optResult, setOptResult] = useState<OptResult | null>(null);

  const updateBuy = (band: "short" | "long", edge: "min" | "max", v: number) =>
    setBuyFilter((f) => ({ ...f, [band]: { ...f[band], [edge]: v } }));
  const updateSell = (band: "short" | "long", edge: "min" | "max", v: number) =>
    setSellFilter((f) => ({ ...f, [band]: { ...f[band], [edge]: v } }));

  const toggle = (key: SeriesKey) =>
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));

  const { chartData, yDomain, monthTicks, indicatorData, widthDomain, spreadDomain, simulation, maxShortWidth, maxLongWidth } = useMemo(() => {
    if (!data.length)
      return {
        chartData: [], yDomain: [0, 100] as [number, number], monthTicks: [] as number[],
        indicatorData: [], widthDomain: [0, 10] as [number, number], spreadDomain: [-5, 5] as [number, number],
        simulation: { results: [] as StrategyResult[], trades: [] as Trade[] },
        maxShortWidth: 10, maxLongWidth: 10,
      };

    let min = Infinity, max = -Infinity;
    let widthMax = 0, sWidthMax = 0, lWidthMax = 0, spreadMin = 0, spreadMax = 0;
    const ticks: number[] = [];
    let lastMonth = -1;

    const processed = data.map((d, i) => {
      const vals = [d.close, d.czerw_top, d.czerw_bot, d.nieb_top, d.nieb_bot, d.ziel_top];
      if (d.sma_200 != null) vals.push(d.sma_200);
      for (const v of vals) { if (v < min) min = v; if (v > max) max = v; }
      const m = new Date(d.date).getMonth();
      if (m !== lastMonth) { ticks.push(i); lastMonth = m; }
      return { ...d, index: i };
    });

    const indicators = data.map((d, i) => {
      const mid = d.close || 1;
      const shortWidth = ((d.czerw_top - d.czerw_bot) / mid) * 100;
      const longWidth = ((d.nieb_top - d.nieb_bot) / mid) * 100;
      const shortMid = (d.czerw_top + d.czerw_bot) / 2;
      const longMid = (d.nieb_top + d.nieb_bot) / 2;
      const spread = ((shortMid - longMid) / mid) * 100;
      widthMax = Math.max(widthMax, shortWidth, longWidth);
      sWidthMax = Math.max(sWidthMax, shortWidth);
      lWidthMax = Math.max(lWidthMax, longWidth);
      spreadMin = Math.min(spreadMin, spread);
      spreadMax = Math.max(spreadMax, spread);
      return {
        index: i,
        date: d.date,
        shortWidth: Math.round(shortWidth * 100) / 100,
        longWidth: Math.round(longWidth * 100) / 100,
        spread: Math.round(spread * 100) / 100,
        spreadPos: spread >= 0 ? Math.round(spread * 100) / 100 : 0,
        spreadNeg: spread < 0 ? Math.round(spread * 100) / 100 : 0,
      };
    });

    const padding = (max - min) * 0.05 || 1;
    const spreadPad = Math.max(Math.abs(spreadMin), Math.abs(spreadMax)) * 0.1 || 0.5;

    return {
      chartData: processed,
      yDomain: [min - padding, max + padding] as [number, number],
      monthTicks: ticks,
      indicatorData: indicators,
      widthDomain: [0, widthMax * 1.15] as [number, number],
      spreadDomain: [spreadMin - spreadPad, spreadMax + spreadPad] as [number, number],
      simulation: simulateStrategies(data, buyFilter, sellFilter, buyConfirmDays, sellConfirmDays),
      maxShortWidth: Math.ceil(sWidthMax * 10) / 10,
      maxLongWidth: Math.ceil(lWidthMax * 10) / 10,
    };
  }, [data, buyFilter, sellFilter, buyConfirmDays, sellConfirmDays]);

  if (!chartData.length) return null;

  const xFmt = (i: number) => {
    const d = chartData[i];
    return d ? monthAbbr[new Date(d.date).getMonth()] || "" : "";
  };

  return (
    <div data-id="gmma-squeeze-chart" className="w-full">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-3 px-2">
        <h3 className="text-lg font-bold text-slate-800">{ticker} — GMMA Bands</h3>
      </div>

      {/* ── Toggle controls ───────────────────────────────────── */}
      <div data-id="chart-toggles" className="flex flex-wrap gap-x-4 gap-y-2 mb-3 px-2">
        {SERIES.map((s) => (
          <label key={s.key} className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={visible[s.key]} onChange={() => toggle(s.key)} className="sr-only peer" />
            <span className="w-4 h-4 rounded border-2 flex items-center justify-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-indigo-400"
              style={{ borderColor: s.color, backgroundColor: visible[s.key] ? s.color : "transparent" }}>
              {visible[s.key] && <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="white" strokeWidth="2"><path d="M2.5 6l2.5 2.5 4.5-5" /></svg>}
            </span>
            {s.isBand
              ? <span className="w-5 h-3 rounded-sm inline-block border" style={{ background: s.fill, borderColor: s.color, borderStyle: s.dash ? "dashed" : "solid" }} />
              : <span className="w-5 h-0 inline-block" style={{ borderBottom: `2.5px ${s.dash ? "dashed" : "solid"} ${s.color}` }} />}
            <span className={`text-xs transition-colors ${visible[s.key] ? "text-slate-700 font-medium" : "text-slate-400 line-through"}`}>{s.label}</span>
          </label>
        ))}
      </div>

      {/* ── Chart guide ───────────────────────────────────────── */}
      <div className="px-2">
        <ChartGuide open={guideOpen} onToggle={() => setGuideOpen((o) => !o)} />
      </div>

      {/* ═══════════════ MAIN PRICE CHART ═══════════════════════ */}
      <ResponsiveContainer width="100%" height={480}>
        <ComposedChart data={chartData} syncId={SYNC_ID} margin={{ ...CHART_MARGIN, top: 10 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <HiddenXAxis monthTicks={monthTicks} formatter={xFmt} />
          <YAxis domain={yDomain} tickFormatter={(v: number) => v.toFixed(1)} width={Y_AXIS_WIDTH} tick={{ fontSize: 11 }} axisLine={{ strokeOpacity: 0.3 }} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {visible.shortBand && <>
            <Area dataKey="czerw_top" stroke={CB.shortBand} strokeWidth={1} fill={CB_FILL.shortBand} isAnimationActive={false} name="Short-term Top" />
            <Area dataKey="czerw_bot" stroke={CB.shortBand} strokeWidth={1} fill="white" isAnimationActive={false} name="Short-term Bot" />
          </>}
          {visible.longBand && <>
            <Area dataKey="nieb_top" stroke={CB.longBand} strokeWidth={1} strokeDasharray={DASH.longBand} fill={CB_FILL.longBand} isAnimationActive={false} name="Long-term Top" />
            <Area dataKey="nieb_bot" stroke={CB.longBand} strokeWidth={1} strokeDasharray={DASH.longBand} fill="white" isAnimationActive={false} name="Long-term Bot" />
          </>}
          {visible.trendLine && <Line dataKey="ziel_top" stroke={CB.trendLine} strokeWidth={1.8} strokeDasharray={DASH.trendLine} dot={false} isAnimationActive={false} name="Trend" />}
          {visible.sma200 && <Line dataKey="sma_200" stroke={CB.sma200} strokeWidth={1.4} strokeDasharray={DASH.sma200} dot={false} isAnimationActive={false} name="SMA 200" connectNulls />}
          {visible.close && <Line dataKey="close" stroke={CB.close} strokeWidth={2} dot={false} isAnimationActive={false} name="Close" />}
        </ComposedChart>
      </ResponsiveContainer>

      {/* ═══════════════ BAND WIDTH ═════════════════════════════ */}
      <div className="border-t border-slate-200 mx-4 mt-1" />
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 pt-2">Band Width (%)</p>
      <ResponsiveContainer width="100%" height={110}>
        <ComposedChart data={indicatorData} syncId={SYNC_ID} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
          <HiddenXAxis monthTicks={monthTicks} formatter={xFmt} />
          <YAxis domain={widthDomain} tickFormatter={(v: number) => v.toFixed(1)} width={Y_AXIS_WIDTH} tick={{ fontSize: 10 }} axisLine={{ strokeOpacity: 0.3 }} tickLine={false} />
          <Tooltip content={<IndicatorTooltip />} />
          <Area dataKey="shortWidth" stroke={CB.shortBand} strokeWidth={1.2} fill={CB_FILL.shortBand} isAnimationActive={false} name="Short-term Width" />
          <Area dataKey="longWidth" stroke={CB.longBand} strokeWidth={1.2} strokeDasharray={DASH.longBand} fill={CB_FILL.longBand} isAnimationActive={false} name="Long-term Width" />
        </ComposedChart>
      </ResponsiveContainer>

      {/* ═══════════════ SPREAD (Short vs Long) ════════════════ */}
      <div className="border-t border-slate-200 mx-4" />
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 pt-2">
        Short vs Long (%) — <span className="text-emerald-600">above 0 = bullish</span>{" "}
        <span className="text-orange-600">below 0 = bearish</span>
      </p>
      <ResponsiveContainer width="100%" height={110}>
        <ComposedChart data={indicatorData} syncId={SYNC_ID} margin={{ ...CHART_MARGIN, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
          <VisibleXAxis monthTicks={monthTicks} formatter={xFmt} />
          <YAxis domain={spreadDomain} tickFormatter={(v: number) => v.toFixed(1)} width={Y_AXIS_WIDTH} tick={{ fontSize: 10 }} axisLine={{ strokeOpacity: 0.3 }} tickLine={false} />
          <Tooltip content={<IndicatorTooltip />} />
          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 2" />
          <Area dataKey="spreadPos" stroke="#059669" strokeWidth={1} fill="rgba(5, 150, 105, 0.2)" isAnimationActive={false} name="Spread (bullish)" connectNulls={false} />
          <Area dataKey="spreadNeg" stroke="#D55E00" strokeWidth={1} fill="rgba(213, 94, 0, 0.2)" isAnimationActive={false} name="Spread (bearish)" connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* ═══════════════ STRATEGY SIMULATION ════════════════════ */}
      {simulation.results.length > 0 && (
        <>
          <div className="border-t-2 border-slate-300 mx-4 mt-4" />
          <div data-id="strategy-simulation" className="px-2 pt-4 pb-2">
            <h4 className="text-sm font-bold text-slate-800 mb-3">
              📊 Strategy Simulation — {INITIAL_CAPITAL.toLocaleString()} {ticker.includes(".") ? "PLN" : "USD"} initial
            </h4>

            {/* Find Best Strategy button */}
            <button
              data-id="btn-find-best"
              disabled={optimizing}
              onClick={() => {
                setOptimizing(true);
                setOptResult(null);
                setTimeout(() => {
                  const result = findBestStrategy(data, maxShortWidth, maxLongWidth);
                  setBuyFilter(result.buyFilter);
                  setSellFilter(result.sellFilter);
                  setBuyConfirmDays(result.buyConfirmDays);
                  setSellConfirmDays(result.sellConfirmDays);
                  setOptResult(result);
                  setOptimizing(false);
                }, 50);
              }}
              className={`mb-3 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                optimizing
                  ? "bg-slate-300 text-slate-500 cursor-wait"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow"
              }`}
            >
              {optimizing ? "⏳ Searching…" : "🔍 Find Best Strategy"}
            </button>
            {optResult && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-3 text-xs">
                <p className="font-semibold text-indigo-800 mb-1">✨ Best found: {optResult.returnPct >= 0 ? "+" : ""}{optResult.returnPct.toFixed(2)}% return ({optResult.trades} trades)</p>
                <p className="text-indigo-600">Buy confirm: {optResult.buyConfirmDays}d · Sell confirm: {optResult.sellConfirmDays}d · Filters auto-applied below.</p>
              </div>
            )}

            {/* Band width filter controls — BUY */}
            <div data-id="sim-buy-filter" className="bg-white rounded-lg border border-slate-200 p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">BUY</span>
                <span className="text-[11px] text-slate-500">Band width range filter for buy signals</span>
              </div>
              <div className="flex items-center gap-3 mb-2.5 bg-emerald-50/50 rounded-md p-2 border border-emerald-100">
                <label className="text-[11px] font-semibold text-emerald-700 whitespace-nowrap">⏱ Confirm days</label>
                <input type="number" min={0} max={30} step={1}
                  value={buyConfirmDays}
                  onChange={(e) => setBuyConfirmDays(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 text-xs px-1.5 py-1 border border-emerald-200 rounded bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                <span className="text-[10px] text-slate-400">0 = instant · Signal must hold N days before buying</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <RangeInput label="Short-term" color={CB.shortBand} fill={CB_FILL.shortBand}
                  range={buyFilter.short} maxVal={maxShortWidth}
                  onMin={(v) => updateBuy("short", "min", v)}
                  onMax={(v) => updateBuy("short", "max", v)} />
                <RangeInput label="Long-term" color={CB.longBand} fill={CB_FILL.longBand}
                  range={buyFilter.long} maxVal={maxLongWidth}
                  onMin={(v) => updateBuy("long", "min", v)}
                  onMax={(v) => updateBuy("long", "max", v)} />
              </div>
            </div>

            {/* Band width filter controls — SELL */}
            <div data-id="sim-sell-filter" className="bg-white rounded-lg border border-slate-200 p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">SELL</span>
                <span className="text-[11px] text-slate-500">Band width range filter for sell signals</span>
              </div>
              <div className="flex items-center gap-3 mb-2.5 bg-red-50/50 rounded-md p-2 border border-red-100">
                <label className="text-[11px] font-semibold text-red-700 whitespace-nowrap">⏱ Confirm days</label>
                <input type="number" min={0} max={30} step={1}
                  value={sellConfirmDays}
                  onChange={(e) => setSellConfirmDays(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 text-xs px-1.5 py-1 border border-red-200 rounded bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-400" />
                <span className="text-[10px] text-slate-400">0 = instant · Signal must hold N days before selling</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <RangeInput label="Short-term" color={CB.shortBand} fill={CB_FILL.shortBand}
                  range={sellFilter.short} maxVal={maxShortWidth}
                  onMin={(v) => updateSell("short", "min", v)}
                  onMax={(v) => updateSell("short", "max", v)} />
                <RangeInput label="Long-term" color={CB.longBand} fill={CB_FILL.longBand}
                  range={sellFilter.long} maxVal={maxLongWidth}
                  onMin={(v) => updateSell("long", "min", v)}
                  onMax={(v) => updateSell("long", "max", v)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {simulation.results.map((r) => {
                const isPositive = r.returnPct >= 0;
                return (
                  <div key={r.name} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="font-semibold text-slate-700 text-sm mb-2">{r.name}</p>
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="text-2xl font-bold text-slate-900">
                        {r.finalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className={`text-sm font-semibold ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                        {isPositive ? "+" : ""}{r.returnPct.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{r.description}</p>
                    <p className="text-xs text-slate-400 mt-1">Trades: {r.trades}</p>
                  </div>
                );
              })}
            </div>

            {/* Trade log */}
            {simulation.trades.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-indigo-600 hover:text-indigo-800 font-medium mb-2">
                  Show GMMA Signal trade log ({simulation.trades.length} trades)
                </summary>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600">
                        <th className="text-left p-2 rounded-tl-md">#</th>
                        <th className="text-left p-2">Action</th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-right p-2">Price</th>
                        <th className="text-right p-2">Shares</th>
                        <th className="text-right p-2 rounded-tr-md">Portfolio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulation.trades.map((t, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-2 text-slate-400">{i + 1}</td>
                          <td className="p-2">
                            <span className={`font-semibold ${t.type === "BUY" ? "text-emerald-600" : "text-red-500"}`}>{t.type}</span>
                          </td>
                          <td className="p-2 text-slate-600">{t.date}</td>
                          <td className="p-2 text-right text-slate-700">{t.price.toFixed(2)}</td>
                          <td className="p-2 text-right text-slate-700">{t.shares.toFixed(2)}</td>
                          <td className="p-2 text-right font-medium text-slate-800">{t.portfolioValue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>
        </>
      )}
    </div>
  );
};
