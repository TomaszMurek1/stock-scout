import React, { useMemo } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  baseChochFields,
  chochFormSchema,
  ChochFormValues,
} from "./choch-page.helpers";
import { ChochOutput, IChochData } from "./choch-output";
import { apiClient } from "@/services/apiClient";
import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import BackToCarousel from "@/components/shared/BackToCarousel";
import FormSubtitle from "@/components/shared/forms/FormSubtitle";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import FormFieldsGenerator from "@/components/shared/forms/form-fields-generator";
import { Zap } from "lucide-react";
import { useScanJob } from "@/hooks/useScanJob";

export default function ChochScanPage() {
  const { startJob, isLoading, result, error, status } = useScanJob<IChochData[]>({
    onCompleted: (data) => console.log("CHoCH scan completed", data),
  });

  const form = useForm<ChochFormValues>({
    resolver: zodResolver(chochFormSchema),
    defaultValues: {
      lookbackPeriod: 10,
      daysToCheck: 60,
      basketIds: [],
      minMarketCap: 1,
    },
  });

  const formFields: IFormGeneratorField<ChochFormValues>[] = useMemo(() => {
    return [
      ...baseChochFields,
      {
        name: "basketIds",
        label: "Select baskets",
        description: "Choose one or more baskets to define the scan universe.",
        type: "basket-chips",
      },
    ];
  }, []);

  const onSubmit: SubmitHandler<ChochFormValues> = (data) => {
    startJob(() =>
      apiClient.post("/technical-analysis/choch", {
        timeframe: "1d",
        lookback_period: data.lookbackPeriod,
        days_to_check: data.daysToCheck,
        basket_ids: data.basketIds.map((id) => Number(id)),
        min_market_cap: data.minMarketCap,
      })
    );
  };

  return (
    <div className="container">
      <BackToCarousel />
      <FormCardGenerator
        title="CHoCH Scan (Bearish to Bullish)"
        icon={Zap}
        subtitle={
          <FormSubtitle
            description={
              <>
                Find stocks showing a probable trend reversal known as <strong>Change of Character (CHoCH)</strong>.
              </>
            }
            bulletPoints={[
              {
                label: "The Setup",
                description: "The stock must be in a confirmed downtrend (Making Lower Highs and Lower Lows).",
              },
              {
                label: "The Trigger",
                description: <>The price breaks <em>above</em> the most recent significant Lower High (LH).</>,
              },
              {
                label: "The Signal",
                description: 'This "Break of Structure" suggests buyers are taking control, marking a potential shift from Bearish to Bullish.',
              },
            ]}
          />
        }
      >
        <FormFieldsGenerator<ChochFormValues>
          form={form}
          formFields={formFields}
          isLoading={isLoading}
          loadingText={status === "RUNNING" ? "Scanning in background..." : "Scanning..."}
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
          <ChochOutput results={result} />
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
