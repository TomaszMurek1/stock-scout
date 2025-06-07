import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import { z } from "zod";

export const BreakEvenPointFormSchema = z.object({
  markets: z.array(z.string()).nonempty("Select at least one market"),
});
export type BreakEvenPointValues = z.infer<typeof BreakEvenPointFormSchema>;

export const BreakEvenPointFormFields: IFormGeneratorField<BreakEvenPointValues>[] =
  [

    {
      name: "markets",
      label: "Select Markets",
      description: "Choose one or more markets to scan.",
      type: "checkbox",
      options: [
        { label: "Nasdaq", value: "XNAS" },
        { label: "NYSE", value: "XNYS" },
        { label: "GPW", value: "XWAR" },
        { label: "London", value: "XLON" },
      ],
    },

  ];
