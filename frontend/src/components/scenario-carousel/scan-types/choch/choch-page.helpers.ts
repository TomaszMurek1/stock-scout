import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import { z } from "zod";

export const chochFormSchema = z.object({
  lookbackPeriod: z.coerce.number().int().positive().min(3),
  daysToCheck: z.coerce.number().int().positive(),
  basketIds: z.array(z.string()).nonempty("Select at least one basket"),
  minMarketCap: z.coerce.number().min(0).optional(),
});
export type ChochFormValues = z.infer<typeof chochFormSchema>;

export const baseChochFields: IFormGeneratorField<ChochFormValues>[] = [
  {
    name: "lookbackPeriod",
    label: "Sensitivity (Lookback Period)",
    description: "Number of periods to determine local highs/lows (e.g. 10). Higher value means finding more significant peaks/troughs.",
    type: "number",
  },
  {
    name: "daysToCheck",
    label: "Pattern Lookback Days",
    description: "How many days back to look for the confirmed pattern setup.",
    type: "number",
  },
  {
    name: "minMarketCap",
    label: "Min Market Cap (Billions)",
    description: "Filter companies with market cap below this value (in Billions). Leave 0 to ignore.",
    type: "number",
  },
];
