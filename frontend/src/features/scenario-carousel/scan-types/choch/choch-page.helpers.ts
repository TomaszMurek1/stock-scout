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
    label: "scans.choch.lookback_period.label",
    description: "scans.choch.lookback_period.description",
    type: "number",
  },
  {
    name: "daysToCheck",
    label: "scans.choch.days_to_check.label",
    description: "scans.choch.days_to_check.description",
    type: "number",
  },
  {
    name: "minMarketCap",
    label: "Min Market Cap (Millions USD)",
    description: "Minimum market capitalization in millions USD (e.g., 1000 for $1B). Values are converted using latest FX rates.",
    type: "number",
  },
];
