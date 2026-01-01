import React, { useMemo, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DeathCrossOutput } from "./death-cross-output";
import { toast } from "react-toastify";
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

export default function DeathCrossPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ScanResultsProps | null>(null);

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

  const onSubmit: SubmitHandler<DeathCrossFormValues> = async (data) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post(
        "/technical-analysis/death-cross",
        {
          short_window: data.shortPeriod,
          long_window: data.longPeriod,
          days_to_look_back: data.daysToLookBack,
          min_volume: 1000000,
          adjusted: false, //use true if you want adjusted_close be used for calculations instead of close
          basket_ids: data.basketIds.map((id) => Number(id)),
          min_market_cap: data.minMarketCap,
        }
      );

      const result: ScanResultsProps = response.data;
      setResults(result);
      console.log("Death Cross Data:", result.data);
      toast.success("Death Cross scan completed successfully");
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
        onSubmit={onSubmit}
      />
      {/* Results - Memoized to prevent re-render on form changes */}
      {useMemo(() => results && results.data && results.data.length > 0 && (
        <DeathCrossOutput results={results.data} />
      ), [results])}
    </FormCardGenerator>
    </div>
  );
}
