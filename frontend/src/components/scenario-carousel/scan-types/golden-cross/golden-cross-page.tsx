import React, { useMemo, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormFieldsGenerator from "../../../shared/forms/form-fields-generator";
import FormCardGenerator from "../../../shared/forms/form-card-generator";
import { GoldenCrossOutput } from "./golden-cross-output";
import { toast } from "react-toastify";
import { ScanResultsProps } from "./golden-cross-page.types";
import {
  baseGoldenCrossFields,
  goldenCrossFormSchema,
  GoldenCrossFormValues,
} from "./golden-cross-page.helpers";
import { apiClient } from "@/services/apiClient";
import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import BackToCarousel from "@/components/shared/BackToCarousel";
import FormSubtitle from "@/components/shared/forms/FormSubtitle";

export default function GoldenCrossScanPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ScanResultsProps | null>(null);

  const form = useForm<GoldenCrossFormValues>({
    resolver: zodResolver(goldenCrossFormSchema),
    defaultValues: {
      shortPeriod: 50,
      longPeriod: 200,
      daysToLookBack: 60,
      basketIds: [],
      minMarketCap: 0,
    },
  });

  const formFields: IFormGeneratorField<GoldenCrossFormValues>[] = useMemo(() => {
    return [
      ...baseGoldenCrossFields,
      {
        name: "basketIds",
        label: "Select baskets",
        description: "Choose one or more baskets to define the scan universe.",
        type: "basket-chips",
      },
    ];
  }, []);

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
          adjusted: false, //use true iof you want adjusted_close be used for caalculations instead of close
          basket_ids: data.basketIds.map((id) => Number(id)),
          min_market_cap: data.minMarketCap,
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
    <div className="container">
      <BackToCarousel />
      <FormCardGenerator
      title="Golden Cross Scan"
      subtitle={
        <FormSubtitle description="Set parameters to scan for stocks showing a Golden Cross pattern." />
      }
    >
      <FormFieldsGenerator<GoldenCrossFormValues>
        form={form}
        formFields={formFields}
        isLoading={isLoading}
        onSubmit={onSubmit}
      />
      {results && results.data && results.data.length > 0 && (
        <GoldenCrossOutput results={results.data} />
      )}
    </FormCardGenerator>
    </div>
  );
}
