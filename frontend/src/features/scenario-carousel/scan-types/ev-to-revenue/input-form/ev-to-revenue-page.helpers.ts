import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import { z } from "zod";

export const EvToRevenueFormSchema = z.object({
  basketIds: z.array(z.string()).nonempty("Select at least one basket"),
  min_ev_to_revenue: z.coerce.number().nonnegative().min(0),
  max_ev_to_revenue: z.coerce.number().nonnegative(),
});
export type EvToRevenueValues = z.infer<typeof EvToRevenueFormSchema>;

export const EvToRevenueFormFields: IFormGeneratorField<EvToRevenueValues>[] =
  [
    {
      name: "min_ev_to_revenue",
      label: "scans.ev_to_revenue.min_ev.label",
      description: "scans.ev_to_revenue.min_ev.description",
      type: "number",
    },
    {
      name: "max_ev_to_revenue",
      label: "scans.ev_to_revenue.max_ev.label",
      description: "scans.ev_to_revenue.max_ev.description",
      type: "number",
    },
    {
      name: "basketIds",
      label: "scans.common.basket_ids.label",
      description: "scans.common.basket_ids.description",
      type: "basket-chips",
    },
  ];
