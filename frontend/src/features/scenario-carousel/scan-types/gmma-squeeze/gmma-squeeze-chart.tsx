import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  Area,
} from "recharts";
import { IGmmaChartDataPoint } from "./gmma-squeeze-form.types";

const monthAbbr = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface GmmaSqueezeChartProps {
  data: IGmmaChartDataPoint[];
  ticker: string;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  // Group by name to avoid duplicates from Area fill+stroke
  const seen = new Set<string>();

  return (
    <div className="bg-white/95 backdrop-blur p-3 border border-slate-200 rounded-lg shadow-lg text-xs min-w-[160px]">
      <p className="font-bold text-slate-700 mb-1.5 border-b border-slate-100 pb-1">{label}</p>
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

export const GmmaSqueezeChart: React.FC<GmmaSqueezeChartProps> = ({ data, ticker }) => {
  const { chartData, yDomain, monthTicks } = useMemo(() => {
    if (!data.length) return { chartData: [], yDomain: [0, 100] as [number, number], monthTicks: [] as number[] };

    let min = Infinity;
    let max = -Infinity;
    const ticks: number[] = [];
    let lastMonth = -1;

    const processed = data.map((d, i) => {
      const vals = [d.close, d.czerw_top, d.czerw_bot, d.nieb_top, d.nieb_bot, d.ziel_top];
      if (d.sma_200 != null) vals.push(d.sma_200);
      for (const v of vals) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const dateObj = new Date(d.date);
      const m = dateObj.getMonth();
      if (m !== lastMonth) {
        ticks.push(i);
        lastMonth = m;
      }
      return { ...d, index: i };
    });

    const padding = (max - min) * 0.05 || 1;
    return {
      chartData: processed,
      yDomain: [min - padding, max + padding] as [number, number],
      monthTicks: ticks,
    };
  }, [data]);

  if (!chartData.length) return null;

  return (
    <div data-id="gmma-squeeze-chart" className="w-full">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 px-2">
        <h3 className="text-lg font-bold text-slate-800">{ticker} — GMMA Bands</h3>
        <div className="flex gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-3 rounded-sm inline-block" style={{ background: "rgba(239, 68, 68, 0.35)" }} /> Red band
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-3 rounded-sm inline-block" style={{ background: "rgba(37, 99, 235, 0.30)" }} /> Blue band
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-1 border-b-2 border-emerald-500 inline-block" /> Green top
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-1 border-b-2 border-dashed border-amber-500 inline-block" /> SMA 200
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-1 border-b-2 border-slate-800 inline-block" /> Close
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={520}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 25, left: 15, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis
            dataKey="index"
            type="number"
            domain={["dataMin", "dataMax"]}
            ticks={monthTicks}
            tickFormatter={(i: number) => {
              const d = chartData[i];
              if (!d) return "";
              return monthAbbr[new Date(d.date).getMonth()] || "";
            }}
            axisLine={{ strokeOpacity: 0.3 }}
            tickLine={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            domain={yDomain}
            tickFormatter={(v: number) => v.toFixed(1)}
            width={60}
            tick={{ fontSize: 11 }}
            axisLine={{ strokeOpacity: 0.3 }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Red band — vivid */}
          <Area
            dataKey="czerw_top"
            stroke="rgba(220, 38, 38, 0.6)"
            strokeWidth={0.8}
            fill="rgba(239, 68, 68, 0.35)"
            isAnimationActive={false}
            name="Red Top"
          />
          <Area
            dataKey="czerw_bot"
            stroke="rgba(220, 38, 38, 0.6)"
            strokeWidth={0.8}
            fill="white"
            isAnimationActive={false}
            name="Red Bot"
          />

          {/* Blue band — vivid */}
          <Area
            dataKey="nieb_top"
            stroke="rgba(37, 99, 235, 0.5)"
            strokeWidth={0.8}
            fill="rgba(37, 99, 235, 0.30)"
            isAnimationActive={false}
            name="Blue Top"
          />
          <Area
            dataKey="nieb_bot"
            stroke="rgba(37, 99, 235, 0.5)"
            strokeWidth={0.8}
            fill="white"
            isAnimationActive={false}
            name="Blue Bot"
          />

          {/* Green top line — vivid */}
          <Line
            dataKey="ziel_top"
            stroke="#059669"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            isAnimationActive={false}
            name="Green Top"
          />

          {/* SMA 200 — amber dashed */}
          <Line
            dataKey="sma_200"
            stroke="#d97706"
            strokeWidth={1.2}
            strokeDasharray="8 4"
            dot={false}
            isAnimationActive={false}
            name="SMA 200"
            connectNulls
          />

          {/* Close price — bold dark on top */}
          <Line
            dataKey="close"
            stroke="#0f172a"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            name="Close"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
