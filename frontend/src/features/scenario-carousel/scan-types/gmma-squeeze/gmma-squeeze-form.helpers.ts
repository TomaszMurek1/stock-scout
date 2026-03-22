import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import { z } from "zod";

export const GmmaSqueezeFormSchema = z.object({
  basketIds: z.array(z.string()).optional(),
  minMarketCap: z.coerce.number().min(0).default(100),
  compressionThreshold: z.coerce.number().min(0.5).max(10).default(3.0),
  bandWidthThreshold: z.coerce.number().min(1).max(20).default(5.0),
  starterSmoothing: z.coerce.number().int().min(1).max(10).default(3),
  sessionLimit: z.coerce.number().int().min(50).max(500).default(200),
  trendFilter: z.array(z.string()).default(["up", "down"]),
});

export type GmmaSqueezeFormValues = z.infer<typeof GmmaSqueezeFormSchema>;

export const GmmaSqueezeFormFields: IFormGeneratorField<GmmaSqueezeFormValues>[] = [
  {
    name: "trendFilter",
    label: "scans.gmma_squeeze.trend_filter.label",
    description: "scans.gmma_squeeze.trend_filter.description",
    type: "checkbox",
    options: [
      { value: "up", label: "▲ Uptrend" },
      { value: "down", label: "▼ Downtrend" },
    ],
  },
  {
    name: "compressionThreshold",
    label: "scans.gmma_squeeze.compression_threshold.label",
    description: "scans.gmma_squeeze.compression_threshold.description",
    type: "number",
  },
  {
    name: "bandWidthThreshold",
    label: "scans.gmma_squeeze.band_width_threshold.label",
    description: "scans.gmma_squeeze.band_width_threshold.description",
    type: "number",
  },
  {
    name: "starterSmoothing",
    label: "scans.gmma_squeeze.starter_smoothing.label",
    description: "scans.gmma_squeeze.starter_smoothing.description",
    type: "number",
  },
  {
    name: "sessionLimit",
    label: "scans.gmma_squeeze.session_limit.label",
    description: "scans.gmma_squeeze.session_limit.description",
    type: "number",
  },
  {
    name: "minMarketCap",
    label: "scans.common.min_market_cap.label",
    description: "scans.common.min_market_cap.description",
    type: "number",
  },
];
