import React, { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormFieldsGenerator from "../../../shared/forms/form-fields-generator";
import ScanResults from "../scan-result";
import FormCardGenerator from "../../../shared/forms/form-card-generator";
import { toast } from "react-toastify";
import { ScanResultsProps } from "./golden-cross-form.types";
import {
  goldenCrossFormFields,
  goldenCrossFormSchema,
  GoldenCrossFormValues,
} from "./golden-cross.helpers";

export default function GoldenCrossScanForm() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ScanResultsProps | null>(null);

  const form = useForm<GoldenCrossFormValues>({
    resolver: zodResolver(goldenCrossFormSchema),
    defaultValues: {
      shortPeriod: 50,
      longPeriod: 200,
      daysToLookBack: 60,
    },
  });

  const onSubmit: SubmitHandler<GoldenCrossFormValues> = async (data) => {
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
    <FormCardGenerator
      title="Golden Cross Scan"
      subtitle=" Set parameters to scan for stocks showing a Golden Cross pattern."
    >
      <FormFieldsGenerator<GoldenCrossFormValues>
        form={form}
        formFields={goldenCrossFormFields}
        isLoading={isLoading}
        onSubmit={onSubmit}
      />
      {results && results.data && results.data.length > 0 && (
        <ScanResults results={results.data} />
      )}
    </FormCardGenerator>
  );
}
