import { formatCurrency } from "@/utils/formatting";
import type { MetricStatus } from "../stock-one-pager.types";

export const formatCompactCurrencyValue = (
  value: number | null | undefined,
  currency?: string | null
) =>
  formatCurrency({
    value,
    currency: currency ?? "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  });

export const meetsThreshold = (value: number | null | undefined, threshold: number, invert = false) => {
  if (value == null) return undefined;
  return invert ? value <= threshold : value >= threshold;
};

export const statusFromMeets = (meets?: boolean): MetricStatus | undefined =>
  meets === undefined ? undefined : meets ? "good" : "bad";
