// src/components/StockOnePager/metric-utils.ts

import { Nullable } from "../types/shared.types";
import { MetricStatus } from "./metric-card";

export const getMetricStatus = (label: string, raw:Nullable<number>): MetricStatus => {
  if (!raw) return "neutral";

  switch (label) {
    case "P/E Ratio":
      if (raw < 5 || raw > 40) return "bad";
      if (raw >= 10 && raw <= 25) return "good";
      return "neutral";

    case "EV/EBITDA":
      return raw < 6 ? "good" : raw < 12 ? "neutral" : "bad";

    case "PEG Ratio":
      return raw <= 1 ? "good" : raw <= 2 ? "neutral" : "bad";

    case "Dividend Yield":
      return raw >= 0.02 && raw <= 0.06 ? "good" : raw > 0.1 ? "bad" : "neutral";

    case "Price to Sales":
      return raw < 2 ? "good" : raw < 5 ? "neutral" : "bad";

    case "Price to Book":
      return raw < 1.5 ? "good" : raw < 3 ? "neutral" : "bad";

    case "Gross Margin":
      return raw > 0.5 ? "good" : raw > 0.2 ? "neutral" : "bad";

    case "Operating Margin":
      return raw > 0.3 ? "good" : raw > 0.1 ? "neutral" : "bad";

    case "Net Margin":
      return raw > 0.2 ? "good" : raw > 0.05 ? "neutral" : "bad";

    case "Rule of 40":
      return raw >= 40 ? "good" : raw >= 30 ? "neutral" : "bad";

    case "EBITDA Margin":
      return raw > 0.2 ? "good" : raw > 0.1 ? "neutral" : "bad";

    case "Revenue Growth":
      return raw > 0.15 ? "good" : raw >= 0 ? "neutral" : "bad";

    case "FCF Margin":
      return raw > 0.1 ? "good" : raw > 0.03 ? "neutral" : "bad";

    case "Cash Conversion":
      return raw > 0.9 ? "good" : raw > 0.5 ? "neutral" : "bad";

    case "CapEx Ratio":
      return raw < 0.1 ? "good" : raw < 0.2 ? "neutral" : "bad";

    case "Annual Volatility":
      return raw < 0.2 ? "good" : raw < 0.4 ? "neutral" : "bad";

    case "Max Drawdown":
      return raw > -0.2 ? "good" : raw > -0.5 ? "neutral" : "bad";

    case "Beta":
      return raw < 1 ? "good" : raw < 1.5 ? "neutral" : "bad";

    default:
      return "neutral";
  }
};