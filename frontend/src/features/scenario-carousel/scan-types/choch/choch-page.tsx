import React, { useMemo, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
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

export default function ChochScanPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<IChochData[] | null>(null);

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

  const onSubmit: SubmitHandler<ChochFormValues> = async (data) => {
    setIsLoading(true);
    setResults(null); 
    try {
      const response = await apiClient.post(
        "/technical-analysis/choch",
        {
          timeframe: "1d",
          lookback_period: data.lookbackPeriod,
          days_to_check: data.daysToCheck,
          basket_ids: data.basketIds.map((id) => Number(id)),
          min_market_cap: data.minMarketCap,
        }
      );

      // response.data should have { status: "success", data: [...] }
      if (response.data.status === "success") {
        setResults(response.data.data);
        if (response.data.data.length === 0) {
            toast.info("No matches found.");
        } else {
            toast.success(`Found ${response.data.data.length} matches!`);
        }
      } else {
        toast.error("Scan failed.");
      }
      
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
      title="CHoCH Scan (Bearish to Bullish)"
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
        onSubmit={onSubmit}
      />
      {results && results.length > 0 && (
        <ChochOutput results={results} />
      )}
    </FormCardGenerator>
    </div>
  );
}
