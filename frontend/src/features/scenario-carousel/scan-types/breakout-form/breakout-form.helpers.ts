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
    label: "scans.consolidation.consolidation_period.label",
    description: "scans.consolidation.consolidation_period.description",
    type: "number",
  },
  {
    name: "thresholdPercentage",
    label: "scans.consolidation.threshold_percentage.label",
    description: "scans.consolidation.threshold_percentage.description",
    type: "number",
  },
  {
    name: "minMarketCap",
    label: "scans.common.min_market_cap.label",
    description: "scans.common.min_market_cap.description",
    type: "number",
  },
];
