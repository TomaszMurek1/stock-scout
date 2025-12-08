import React, { useEffect, useMemo, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormFieldsGenerator from "../../../shared/forms/form-fields-generator";
import FormCardGenerator from "../../../shared/forms/form-card-generator";
import { toast } from "react-toastify";
import {
  baseChochFields,
  chochFormSchema,
  ChochFormValues,
} from "./choch-page.helpers";
import { ChochOutput, IChochData } from "./choch-output";
import { apiClient } from "@/services/apiClient";
import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";

interface BasketOption {
  id: number;
  name: string;
  type: string;
}

export default function ChochScanPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<IChochData[] | null>(null);
  const [basketOptions, setBasketOptions] = useState<BasketOption[]>([]);

  const form = useForm<ChochFormValues>({
    resolver: zodResolver(chochFormSchema),
    defaultValues: {
      lookbackPeriod: 10,
      daysToCheck: 60,
      basketIds: [],
      minMarketCap: 1,
    },
  });

  useEffect(() => {
    const fetchBaskets = async () => {
      try {
        const response = await apiClient.get("/baskets");
        setBasketOptions(response.data || []);
      } catch (error) {
        console.error("Failed to load baskets", error);
        toast.error("Unable to load baskets. Please try again later.");
      }
    };
    fetchBaskets();
  }, []);

  const formFields: IFormGeneratorField<ChochFormValues>[] = useMemo(() => {
    return [
      ...baseChochFields,
      {
        name: "basketIds",
        label: "Select baskets",
        description: "Choose one or more baskets to define the scan universe.",
        type: "checkbox",
        options: basketOptions.map((basket) => ({
          label: `${basket.name} (${basket.type})`,
          value: String(basket.id),
        })),
      },
    ];
  }, [basketOptions]);

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
    <FormCardGenerator
      title="CHoCH Scan (Bearish to Bullish)"
      subtitle={
        <div className="space-y-2">
          <p>
            Find stocks showing a probable trend reversal known as <strong>Change of Character (CHoCH)</strong>.
          </p>
          <ul className="list-disc list-inside text-sm text-gray-700 ml-2">
            <li><strong>The Setup:</strong> The stock must be in a confirmed downtrend (Making Lower Highs and Lower Lows).</li>
            <li><strong>The Trigger:</strong> The price breaks <em>above</em> the most recent significant Lower High (LH).</li>
            <li><strong>The Signal:</strong> This "Break of Structure" suggests buyers are taking control, marking a potential shift from Bearish to Bullish.</li>
          </ul>
        </div>
      }
    >
      <FormFieldsGenerator<ChochFormValues>
        form={form}
        formFields={formFields}
        isLoading={isLoading}
        onSubmit={onSubmit}
      />
      {basketOptions.length === 0 && (
        <p className="text-sm text-slate-500 px-4">
          No baskets available. Create a market/index/favorites basket to start scanning.
        </p>
      )}
      {results && results.length > 0 && (
        <ChochOutput results={results} />
      )}
    </FormCardGenerator>
  );
}
