import React, { useMemo } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DeathCrossOutput } from "./death-cross-output";
import { ScanResultsProps } from "./death-cross-page.types";
import {
  baseDeathCrossFields,
  deathCrossFormSchema,
  DeathCrossFormValues,
} from "./death-cross-page.helpers";
import { apiClient } from "@/services/apiClient";
import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import BackToCarousel from "@/components/shared/BackToCarousel";
import FormSubtitle from "@/components/shared/forms/FormSubtitle";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import FormFieldsGenerator from "@/components/shared/forms/form-fields-generator";
import { Skull } from "lucide-react";
import { useScanJob } from "@/hooks/useScanJob";

export default function DeathCrossPage() {
  const { startJob, isLoading, result, error, status } = useScanJob<ScanResultsProps['data']>({
    onCompleted: (data) => console.log("Death Cross completed", data),
  });

  const form = useForm<DeathCrossFormValues>({
    resolver: zodResolver(deathCrossFormSchema),
    defaultValues: {
      shortPeriod: 50,
      longPeriod: 200,
      daysToLookBack: 60,
      basketIds: [],
      minMarketCap: 0,
    },
  });

  const formFields: IFormGeneratorField<DeathCrossFormValues>[] = useMemo(() => {
    return [
      ...baseDeathCrossFields,
      {
        name: "basketIds",
        label: "Select baskets",
        description: "Choose one or more baskets to define the scan universe.",
        type: "basket-chips",
      },
    ];
  }, []);

  const onSubmit: SubmitHandler<DeathCrossFormValues> = (data) => {
    startJob(() =>
      apiClient.post("/technical-analysis/death-cross", {
        short_window: data.shortPeriod,
        long_window: data.longPeriod,
        days_to_look_back: data.daysToLookBack,
        min_volume: 1000000,
        adjusted: false,
        basket_ids: data.basketIds.map((id) => Number(id)),
        min_market_cap: data.minMarketCap,
      })
    );
  };

  return (
    <div className="container">
      <BackToCarousel />
      <FormCardGenerator
        title="Death Cross Scan"
        icon={Skull}
        subtitle={
          <FormSubtitle description="Set parameters to scan for stocks showing a Death Cross pattern (bearish signal)." />
        }
      >
        <FormFieldsGenerator<DeathCrossFormValues>
          form={form}
          formFields={formFields}
          isLoading={isLoading}
          loadingText={status === "RUNNING" ? "Scanning in background..." : "Starting..."}
          onSubmit={onSubmit}
        />
        
         {/* Error Message */}
         {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                <p>Error: {error}</p>
            </div>
        )}

        {/* Results */}
        {useMemo(() => result && result.length > 0 && (
          <DeathCrossOutput results={result} />
        ), [result])}
         {result && result.length === 0 && (
             <div className="mt-6 text-center text-gray-500">
                No results found matching your criteria.
             </div>
        )}
      </FormCardGenerator>
    </div>
  );
}
