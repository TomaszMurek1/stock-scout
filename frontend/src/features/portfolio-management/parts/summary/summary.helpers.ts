// Re-export from the canonical formatting module.
// Kept for backward compatibility — new code should import from "@/utils/formatting".
export {
  type CurrencyCode,
  currencyLocaleMap,
  formatCurrency,
  formatPercent,
} from "@/utils/formatting";
