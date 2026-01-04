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
    label: "scans.wyckoff.lookback_days.label",
    description: "scans.wyckoff.lookback_days.description",
    type: "number",
  },
  {
    name: "minScore",
    label: "scans.wyckoff.min_score.label",
    description: "scans.wyckoff.min_score.description",
    type: "number",
  },
  {
    name: "minMarketCap",
    label: "scans.common.min_market_cap.label",
    description: "scans.common.min_market_cap.description",
    type: "number",
  },
];

export const weightFields: IFormGeneratorField<WyckoffFormValues>[] = [
  {
    name: "weightTradingRange",
    label: "scans.wyckoff.weights.trading_range.label",
    description: "scans.wyckoff.weights.trading_range.description",
    type: "number",
  },
  {
    name: "weightVolumePattern",
    label: "scans.wyckoff.weights.volume_pattern.label",
    description: "scans.wyckoff.weights.volume_pattern.description",
    type: "number",
  },
  {
    name: "weightSpring",
    label: "scans.wyckoff.weights.spring.label",
    description: "scans.wyckoff.weights.spring.description",
    type: "number",
  },
  {
    name: "weightSupportTests",
    label: "scans.wyckoff.weights.support_tests.label",
    description: "scans.wyckoff.weights.support_tests.description",
    type: "number",
  },
  {
    name: "weightSignsOfStrength",
    label: "scans.wyckoff.weights.signs_of_strength.label",
    description: "scans.wyckoff.weights.signs_of_strength.description",
    type: "number",
  },
];
