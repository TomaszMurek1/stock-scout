import { z } from "zod";

export const fxPairSchema = z.object({
  base: z.string().min(3, "Base currency is required"),
  quote: z.string().min(3, "Quote currency is required"),
});

export const fxBatchSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  pairs: z.array(fxPairSchema).min(1, "At least one pair is required"),
});

export type FxBatchValues = z.infer<typeof fxBatchSchema>;

export const defaultFxBatchValues: FxBatchValues = {
  start: "",
  end: "",
  pairs: [{ base: "USD", quote: "PLN" }],
};
