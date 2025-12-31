import { z } from "zod";

export const createTickerSchema = z.object({
  country: z.coerce.string(),
  market: z.coerce.string(),
});
export type CreateTickerValues = z.infer<typeof createTickerSchema>;

export const createTickersFormFields: {
  name: keyof CreateTickerValues;
  label: string;
  description: string;
  type: string;
}[] = [
  {
    name: "country",
    label: "Country name",
    description: "The ...",
    type: "string",
  },
  {
    name: "market",
    label: "Market Name",
    description: "The....",
    type: "string",
  },
];
