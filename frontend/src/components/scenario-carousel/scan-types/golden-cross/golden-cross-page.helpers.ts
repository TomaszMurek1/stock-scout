import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import { z } from "zod";

export const goldenCrossFormSchema = z.object({
  shortPeriod: z.coerce
    .number()
    .int()
    .positive()
    .max(200, "Short period should be less than long period"),
  longPeriod: z.coerce.number().int().positive().min(1),
  daysToLookBack: z.coerce.number().int().positive(),
  basketIds: z.array(z.string()).nonempty("Select at least one basket"),
});
export type GoldenCrossFormValues = z.infer<typeof goldenCrossFormSchema>;

export const baseGoldenCrossFields: IFormGeneratorField<GoldenCrossFormValues>[] = [
  {
    name: "shortPeriod",
    label: "Short Period (days)",
    description:
      "The number of days for the short-term moving average (e.g., 50 days).",
    type: "number",
  },
  {
    name: "longPeriod",
    label: "Long Period (days)",
    description:
      "The number of days for the long-term moving average (e.g., 200 days).",
    type: "number",
  },
  {
    name: "daysToLookBack",
    label: "Days to Look Back",
    description:
      "The number of days in the past to analyze for the Golden Cross pattern.",
    type: "number",
  },
];
