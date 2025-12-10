import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import { z } from "zod";

export const EvToRevenueFormSchema = z.object({
  markets: z.array(z.string()).nonempty("Select at least one market"),
  min_ev_to_revenue: z.coerce.number().int().positive().min(0),
  max_ev_to_revenue: z.coerce.number().int().positive(),
});
export type EvToRevenueValues = z.infer<typeof EvToRevenueFormSchema>;

export const EvToRevenueFormFields: IFormGeneratorField<EvToRevenueValues>[] =
  [

    {
      name: "markets",
      label: "Select Markets",
      description: "Choose one or more stock exchanges to scan for undervalued companies.",
      type: "checkbox",
      options: [
        { label: "Nasdaq", value: "XNAS" },
        { label: "NYSE", value: "XNYS" },
        { label: "GPW (Warsaw)", value: "XWAR" },
        { label: "London Stock Exchange", value: "XLON" },
      ],
    },
    {
      name: "min_ev_to_revenue",
      label: "Minimum EV/Revenue Ratio",
      description: "Lower bound for the Enterprise Value to Revenue ratio (e.g., 0 for no minimum).",
      type: "number",
    },
    {
      name: "max_ev_to_revenue",
      label: "Maximum EV/Revenue Ratio",
      description: "Upper bound for the ratio. Lower values (e.g., 1-3) indicate potentially undervalued growth stocks.",
      type: "number",
    },
  ];
