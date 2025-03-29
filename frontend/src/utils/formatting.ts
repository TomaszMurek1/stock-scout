import { Nullable } from "@/components/types/shared.types";

export function formatPercentage(value: number | null | undefined): string {
  return value !== null && value !== undefined
    ? `${(value * 100).toFixed(2)}%`
    : "N/A";
}

export function formatCurrency(
  value: Nullable<number>,
  currency: string | null = "PLN"
): string {
  if (!value || !currency) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(value: number | null, decimals = 2): string {
  if (value === null) return "N/A";
  return value.toLocaleString("en-US", { maximumFractionDigits: decimals });
}