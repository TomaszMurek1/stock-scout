export type CurrencyCode = "USD" | "EUR" | "GBP" | "PLN";

export const currencyLocaleMap: Record<CurrencyCode, string> = {
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  PLN: "pl-PL",
};

export const formatCurrency = (
  value: number,
  currency: CurrencyCode,
  locale = currencyLocaleMap[currency]
): string =>
  value.toLocaleString(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const formatPercent = (value: number, decimals = 2): string =>
  `${value.toFixed(decimals)}%`;
