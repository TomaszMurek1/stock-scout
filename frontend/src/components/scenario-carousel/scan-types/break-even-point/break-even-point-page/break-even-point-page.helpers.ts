import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import { z } from "zod";

export const BreakEvenPointFormSchema = z.object({
  basketIds: z.array(z.string()).nonempty("Select at least one basket"),
});
export type BreakEvenPointValues = z.infer<typeof BreakEvenPointFormSchema>;

export const BreakEvenBaseFields: IFormGeneratorField<BreakEvenPointValues>[] = [];
