import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import { z } from "zod";

export const deathCrossFormSchema = z.object({
  shortPeriod: z.coerce
    .number()
    .int()
    .positive()
    .max(200, "Short period should be less than long period"),
  longPeriod: z.coerce.number().int().positive().min(1),
  daysToLookBack: z.coerce.number().int().positive(),
  basketIds: z.array(z.string()).nonempty("Select at least one basket"),
  minMarketCap: z.coerce.number().min(0).optional(),
});
export type DeathCrossFormValues = z.infer<typeof deathCrossFormSchema>;

export const baseDeathCrossFields: IFormGeneratorField<DeathCrossFormValues>[] = [
  {
    name: "shortPeriod",
    label: "scans.common.short_period.label",
    description: "scans.common.short_period.description",
    type: "number",
  },
  {
    name: "longPeriod",
    label: "scans.common.long_period.label",
    description: "scans.common.long_period.description",
    type: "number",
  },
  {
    name: "daysToLookBack",
    label: "scans.common.days_to_look_back.label",
    description: "scans.common.days_to_look_back.description",
    type: "number",
  },
  {
    name: "minMarketCap",
    label: "scans.common.min_market_cap.label",
    description: "scans.common.min_market_cap.description",
    type: "number",
  },
];
