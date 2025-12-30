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
    label: "Threshold %",
    description: "Maximum % of revenue the company can be losing. Profitable firms always pass.",
    type: "number",
  },
  {
    name: "minMarketCap",
    label: "Min Market Cap (M)",
    description: "Minimum market capitalization in millions.",
    type: "number",
  },
];
