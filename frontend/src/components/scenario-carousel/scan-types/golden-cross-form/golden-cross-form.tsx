import React, { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import GoldenCrossFormFields from "./form-fields";
import ScanResults from "../scan-result";
import GoldenCrossCard from "./golden-cross-card";
import { toast } from "react-toastify";
import { ScanResultsProps } from "./golden-cross-form.types";

const formSchema = z.object({
  shortPeriod: z.coerce
    .number()
    .int()
    .positive()
    .max(200, "Short period should be less than long period"),
  longPeriod: z.coerce.number().int().positive().min(1),
  daysToLookBack: z.coerce.number().int().positive(),
});
export type FormValues = z.infer<typeof formSchema>;

export default function GoldenCrossScanForm() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ScanResultsProps | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shortPeriod: 50,
      longPeriod: 200,
      daysToLookBack: 60,
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);

    try {
      const response = await fetch(
        "http://localhost:8000/technical-analysis/golden-cross",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            short_window: data.shortPeriod,
            long_window: data.longPeriod,
            days_to_look_back: data.daysToLookBack,
            min_volume: 1000000,
            adjusted: true,
            markets: ["NYSE"],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "An error occurred during the scan"
        );
      }

      const result: ScanResultsProps = await response.json();
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
