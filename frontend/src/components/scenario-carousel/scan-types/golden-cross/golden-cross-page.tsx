import React, { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormFieldsGenerator from "../../../shared/forms/form-fields-generator";
import ScanResults from "../scan-result";
import FormCardGenerator from "../../../shared/forms/form-card-generator";
import { toast } from "react-toastify";
import { ScanResultsProps } from "./golden-cross-page.types";
import {
  goldenCrossFormFields,
  goldenCrossFormSchema,
  GoldenCrossFormValues,
} from "./golden-cross-page.helpers";
import { apiClient } from "@/services/apiClient";

export default function GoldenCrossScanPage() {
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
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
  const onSubmit: SubmitHandler<GoldenCrossFormValues> = async (data) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post(
        "/technical-analysis/golden-cross",
        {
          short_window: data.shortPeriod,
          long_window: data.longPeriod,
          days_to_look_back: data.daysToLookBack,
          min_volume: 1000000,
          adjusted: true,
          markets: data.markets,
        }
      );
  
      const result: ScanResultsProps = response.data;
      setResults(result);
      console.log("Golden Cross Data:", result.data);
      toast.success("Golden Cross scan completed successfully");
    } catch (error: any) {
      console.error("API error:", error);
      
      const errorMessage = error.response?.data?.detail 
        || error.message 
        || "Network error. Please try again.";
        
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
