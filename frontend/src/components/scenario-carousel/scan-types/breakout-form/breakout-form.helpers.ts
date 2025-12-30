import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import { z } from "zod";

export const BreakoutFormSchema = z.object({
  consolidationPeriod: z.coerce.number().int().positive().min(5, "Minimum 5 days"),
  thresholdPercentage: z.coerce.number().positive().min(0.1, "Minimum 0.1%"),
  basketIds: z.array(z.string()).optional(),
  minMarketCap: z.coerce.number().min(0).default(0),
});

export type BreakoutFormValues = z.infer<typeof BreakoutFormSchema>;

export const BreakoutFormFields: IFormGeneratorField<BreakoutFormValues>[] = [
  {
    name: "consolidationPeriod",
    label: "Consolidation Period",
    description: "Number of days the stock must trade within a tight range (e.g., 20 days).",
    type: "number",
  },
  {
    name: "thresholdPercentage",
    label: "Maximum Range (%)",
    description: "Maximum allowed price movement (High-Low) during the period to consider it a consolidation.",
    type: "number",
  },
  {
    name: "minMarketCap",
    label: "Min Market Cap (Millions USD)",
    description: "Minimum market capitalization in millions USD (e.g., 1000 for $1B). Values are converted using latest FX rates.",
    type: "number",
  },
];
