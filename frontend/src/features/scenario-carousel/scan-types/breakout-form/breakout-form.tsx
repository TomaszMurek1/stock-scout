import React, { useMemo } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormFieldsGenerator from "@/components/shared/forms/form-fields-generator";
import {
  BreakoutFormSchema,
  BreakoutFormValues,
  BreakoutFormFields,
} from "./breakout-form.helpers";
import { apiClient } from "@/services/apiClient";
import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import { BreakoutScanResponse, IBreakoutResultItem } from "./breakout-form.types";
import { BreakoutOutput } from "./breakout-output";
import { useScanJob } from "@/hooks/useScanJob";

const BreakoutForm: React.FC = () => {
  const { startJob, isLoading, result, error, status } = useScanJob<BreakoutScanResponse>({
    onCompleted: (data) => console.log("Consolidation scan completed", data),
  });

  const form = useForm<BreakoutFormValues>({
    resolver: zodResolver(BreakoutFormSchema),
    defaultValues: {
      consolidationPeriod: 20,
      thresholdPercentage: 5,
      basketIds: [],
      minMarketCap: 0,
    },
  });

  const formFields: IFormGeneratorField<BreakoutFormValues>[] = useMemo(() => {
    return [
      ...BreakoutFormFields,
      {
        name: "basketIds",
        label: "Select baskets",
        description: "Choose one or more baskets to define the scan universe.",
        type: "basket-chips",
      },
    ];
  }, []);

  const onSubmit: SubmitHandler<BreakoutFormValues> = (data) => {
    startJob(() =>
      apiClient.post("/technical-analysis/breakout", {
        consolidation_period: data.consolidationPeriod,
        threshold_percentage: data.thresholdPercentage,
        basket_ids: data.basketIds?.map((id) => Number(id)) || [],
        min_market_cap: data.minMarketCap,
      })
    );
  };

  const results = result?.data || [];

  return (
    <div className="space-y-6">
      <FormFieldsGenerator<BreakoutFormValues>
        form={form}
        formFields={formFields} 
        isLoading={isLoading}
        loadingText={status === "RUNNING" ? "Analyzing companies..." : "Scanning..."}
        onSubmit={onSubmit}
      />
      
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
          <p>Error: {error}</p>
        </div>
      )}

      {/* Results - Memoized to prevent re-render on form changes */}
      {useMemo(() => results.length > 0 && <BreakoutOutput results={results} />, [results])}
      
      {result && results.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          No candidates found matching your consolidation criteria.
        </div>
      )}
    </div>
  );
};

export default BreakoutForm;
