import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import GoldenCrossFormFields from "./form-fields";
import ScanResults from "../scan-result";
import GoldenCrossCard from "./golden-cross-card";
import { toast } from "react-toastify";

const formSchema = z.object({
  shortPeriod: z.coerce
    .number()
    .int()
    .positive()
    .max(200, "Short period should be less than long period"),
  longPeriod: z.coerce.number().int().positive().min(1),
  daysToLookBack: z.coerce.number().int().positive(),
});

type FormValues = z.infer<typeof formSchema>;
type ISingleItem = {
  ticker: string;
  name: string;
  date: string;
  days_since_cross: number;
  close: number;
  short_ma: number;
  long_ma: number;
  volume: number;
};

type IData = {
  ticker: string;
  data: ISingleItem;
};

export interface ScanResultsProps {
  status: string;
  data: IData[];
}

const mockScanSubmission = async (values: FormValues): Promise<string[]> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return ["AAPL", "GOOGL", "MSFT"];
};

export default function GoldenCrossScanForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ScanResultsProps | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shortPeriod: 50,
      longPeriod: 200,
      daysToLookBack: 60,
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(
        "http://localhost:8000/technical-analysis/golden-cross",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            short_window: form.getValues("shortPeriod"),
            long_window: form.getValues("longPeriod"),
            days_to_look_back: form.getValues("daysToLookBack"),
            min_volume: 1000000,
            adjusted: true,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "An error occurred during the scan"
        );
      }

      const result = await response.json();
      console.log("Golden Cross Data:", result.data);
      toast.success("Golden Cross scan completed successfully");
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Network error. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    setIsLoading(true);

    try {
      const response = await fetch(
        "http://localhost:8000/technical-analysis/golden-cross",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            short_window: form.getValues("shortPeriod"),
            long_window: form.getValues("longPeriod"),
            days_to_look_back: form.getValues("daysToLookBack"),
            min_volume: 1000000,
            adjusted: true,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "An error occurred during the scan"
        );
      }

      const result = await response.json();
      setResults(result);
      console.log("Golden Cross Data:", result.data);
      toast.success("Golden Cross scan completed successfully");
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Network error. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };
  console.log("results", results);

  return (
    <GoldenCrossCard>
      <GoldenCrossFormFields
        form={form}
        isLoading={isLoading}
        onSubmit={onSubmit}
      />
      {results && results.data && results.data.length > 0 && (
        <ScanResults results={results.data} />
      )}
    </GoldenCrossCard>
  );
}
