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
      description: "Choose one or more markets to scan.",
      type: "checkbox", // Add this field
      options: [
        { label: "Nasdaq", value: "XNYS" },
        { label: "NYSE", value: "XNAS" },
        { label: "GPW", value: "XWAR" },
        { label: "London", value: "XLON" },
      ],
    },
    {
      name: "min_ev_to_revenue",
      label: "min_ev_to_revenue",
      description:
        "The number",
      type: "number",
    },
    {
      name: "max_ev_to_revenue",
      label: "max_ev_to_revenue",
      description:
        "The number",
      type: "number",
    },
  ];
