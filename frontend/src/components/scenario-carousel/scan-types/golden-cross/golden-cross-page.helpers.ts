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
  markets: z.array(z.string()).nonempty("Select at least one market"),
});
export type GoldenCrossFormValues = z.infer<typeof goldenCrossFormSchema>;

export const goldenCrossFormFields: IFormGeneratorField<GoldenCrossFormValues>[] =
  [
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
    {
      name: "markets",
      label: "Select Markets",
      description: "Choose one or more markets to scan.",
      type: "checkbox", // Add this field
      options: [
        { label: "Nasdaq", value: "XNAS" },
        { label: "NYSE", value: "XNYS" },
        { label: "GPW", value: "XWAR" },
        { label: "London", value: "XLON" },
      ],
    },
  ];
