import { Nullable } from "@/components/types/shared.types";

export function formatPercentage(value: number | null | undefined): string {
  return value !== null && value !== undefined ? `${(value * 100).toFixed(2)}%` : "N/A";
}

interface FormatCurrencyOptions {
  value: Nullable<number>;
  currency?: string | null;
  notation?: Intl.NumberFormatOptions["notation"];
  maximumFractionDigits?: number;
  signDisplay?: Intl.NumberFormatOptions["signDisplay"];
}

export function formatCurrency({
  value,
  currency = "USD",
  notation = "standard",
  maximumFractionDigits = 2,
  signDisplay,
}: FormatCurrencyOptions): string {
  if (value == null || !currency) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation,
    maximumFractionDigits,
    signDisplay,
  }).format(value);
}

export function formatNumber(value: Nullable<number>, decimals = 2): string {
  if (!value) return "N/A";
  return value.toLocaleString("en-US", { maximumFractionDigits: decimals });
}
