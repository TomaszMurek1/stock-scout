import { z } from "zod";
import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";

export const wyckoffFormSchema = z.object({
  lookbackDays: z.coerce.number().int().min(30, "Minimum 30 days").max(365, "Maximum 365 days"),
  basketIds: z.array(z.string()).optional(),
  minMarketCap: z.coerce.number().min(0).default(500),
  minScore: z.coerce.number().min(0, "Minimum 0%").max(100, "Maximum 100%"),
  // Weights (must sum to 100)
  weightTradingRange: z.coerce.number().min(0).max(100).default(25),
  weightVolumePattern: z.coerce.number().min(0).max(100).default(25),
  weightSpring: z.coerce.number().min(0).max(100).default(20),
  weightSupportTests: z.coerce.number().min(0).max(100).default(15),
  weightSignsOfStrength: z.coerce.number().min(0).max(100).default(15),
}).refine(
  (data) => {
    // Validate at least one basket is selected
    return data.basketIds && data.basketIds.length > 0;
  },
  {
    message: "Please select at least one basket",
    path: ["basketIds"],
  }
).refine(
  (data) => {
    // Validate weights sum to 100%
    const total = 
      data.weightTradingRange +
      data.weightVolumePattern +
      data.weightSpring +
      data.weightSupportTests +
      data.weightSignsOfStrength;
    return Math.abs(total - 100) < 0.1; // Allow small floating point error
  },
  {
    message: "Weights must sum to 100%",
    path: ["weightTradingRange"], // Show error on first field
  }
);

export type WyckoffFormValues = z.infer<typeof wyckoffFormSchema>;

export const basicWyckoffFields: IFormGeneratorField<WyckoffFormValues>[] = [
  {
    name: "lookbackDays",
    label: "Lookback Period (days)",
    description: "Number of days to analyze for accumulation patterns",
    type: "number",
  },
  {
    name: "minScore",
    label: "Minimum Overall Score (%)",
    description: "Only show stocks with accumulation score above this threshold",
    type: "number",
  },
  {
    name: "minMarketCap",
    label: "Min Market Cap (Millions USD)",
    description: "Minimum market capitalization in millions USD (e.g., 1000 for $1B). Values are converted using latest FX rates.",
    type: "number",
  },
];

export const weightFields: IFormGeneratorField<WyckoffFormValues>[] = [
  {
    name: "weightTradingRange",
    label: "Weight: Trading Range (%)",
    description: "Importance of horizontal consolidation pattern (0-100%)",
    type: "number",
  },
  {
    name: "weightVolumePattern",
    label: "Weight: Volume Pattern (%)",
    description: "Importance of declining volume and absorption signs (0-100%)",
    type: "number",
  },
  {
    name: "weightSpring",
    label: "Weight: Spring (%)",
    description: "Importance of final shakeout below support (0-100%)",
    type: "number",
  },
  {
    name: "weightSupportTests",
    label: "Weight: Support Tests (%)",
    description: "Importance of successful support holds (0-100%)",
    type: "number",
  },
  {
    name: "weightSignsOfStrength",
    label: "Weight: Signs of Strength (%)",
    description: "Importance of wide-spread up days (0-100%)",
    type: "number",
  },
];
