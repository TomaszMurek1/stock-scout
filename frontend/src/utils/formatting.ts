import { Nullable } from "@/components/types/shared.types";

// ── Currency locale mapping ───────────────────────────────────────
// Moved from summary.helpers.ts so it lives next to the formatters.

export type CurrencyCode = "USD" | "EUR" | "GBP" | "PLN";

export const currencyLocaleMap: Record<CurrencyCode, string> = {
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  PLN: "pl-PL",
};

// ── formatCurrency ────────────────────────────────────────────────
// Consolidated from 4 separate definitions across the codebase.
// Supports both "options‐object" API (stock-one-pager, scans) and a
// quick positional call  formatCurrency(value, currency).

interface FormatCurrencyOptions {
  value: Nullable<number>;
  currency?: string | null;
  notation?: Intl.NumberFormatOptions["notation"];
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  signDisplay?: Intl.NumberFormatOptions["signDisplay"];
  locale?: string;
}

export function formatCurrency(opts: FormatCurrencyOptions): string;
export function formatCurrency(value: Nullable<number>, currency?: string | null): string;
export function formatCurrency(
  first: FormatCurrencyOptions | Nullable<number>,
  second?: string | null,
): string {
  // Normalise the two overloads into one shape
  let value: Nullable<number>;
  let currency: string | null | undefined;
  let notation: Intl.NumberFormatOptions["notation"] = "standard";
  let maximumFractionDigits = 2;
  let minimumFractionDigits = 2;
  let signDisplay: Intl.NumberFormatOptions["signDisplay"] | undefined;
  let locale: string | undefined;

  if (first !== null && first !== undefined && typeof first === "object") {
    // Options‐object form
    value = first.value;
    currency = first.currency;
    notation = first.notation ?? "standard";
    maximumFractionDigits = first.maximumFractionDigits ?? 2;
    minimumFractionDigits = first.minimumFractionDigits ?? 2;
    signDisplay = first.signDisplay;
    locale = first.locale;
  } else {
    // Positional form: formatCurrency(123.4, "USD")
    value = first;
    currency = second;
  }

  if (value == null || !currency) return "N/A";

  // Pick locale: explicit > currencyLocaleMap > undefined (browser default)
  const resolvedLocale =
    locale ?? (currencyLocaleMap as Record<string, string>)[currency] ?? undefined;

  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency,
      notation,
      maximumFractionDigits,
      minimumFractionDigits,
      signDisplay,
    }).format(value);
  } catch {
    // Fallback for invalid currency codes (from formatCurrencySafe)
    return `${value.toFixed(maximumFractionDigits)} ${currency}`;
  }
}

// ── formatPercentage ──────────────────────────────────────────────
// Input is a *ratio* (0.15 → "15.00%").

export function formatPercentage(
  value: number | null | undefined,
  decimals = 2,
): string {
  if (value === null || value === undefined) return "N/A";
  return `${(value * 100).toFixed(decimals)}%`;
}

// ── formatPercent ─────────────────────────────────────────────────
// Input is already a *percentage* (15 → "15.00%").

export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

// ── formatNumber ──────────────────────────────────────────────────

export function formatNumber(
  value: Nullable<number>,
  decimals = 2,
): string {
  if (value == null) return "N/A";
  return value.toLocaleString("en-US", { maximumFractionDigits: decimals });
}
