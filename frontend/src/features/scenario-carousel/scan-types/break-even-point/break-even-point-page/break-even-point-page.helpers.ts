import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import { z } from "zod";

export const BreakEvenPointFormSchema = z.object({
  basketIds: z.array(z.string()).nonempty("Select at least one basket"),
  thresholdPct: z.coerce.number().min(0).max(100).default(5),
  minMarketCap: z.coerce.number().min(0).optional(),
});
export type BreakEvenPointValues = z.infer<typeof BreakEvenPointFormSchema>;

export const BreakEvenBaseFields: IFormGeneratorField<BreakEvenPointValues>[] = [
  {
    name: "thresholdPct",
    label: "scans.break_even_point.threshold_pct.label",
    description: "scans.break_even_point.threshold_pct.description",
    type: "number",
  },
  {
    name: "minMarketCap",
    label: "scans.common.min_market_cap.label",
    description: "scans.common.min_market_cap.description",
    type: "number",
  },
];
