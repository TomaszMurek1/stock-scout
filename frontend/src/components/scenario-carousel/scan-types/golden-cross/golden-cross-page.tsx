import React, { useEffect, useMemo, useState } from "react";
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

interface BasketOption {
  id: number;
  name: string;
  type: string;
}

export default function GoldenCrossScanPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ScanResultsProps | null>(null);
  const [basketOptions, setBasketOptions] = useState<BasketOption[]>([]);

  const form = useForm<GoldenCrossFormValues>({
    resolver: zodResolver(goldenCrossFormSchema),
    defaultValues: {
      shortPeriod: 50,
      longPeriod: 200,
      daysToLookBack: 60,
      basketIds: [],
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

  const formFields: IFormGeneratorField<GoldenCrossFormValues>[] = useMemo(() => {
    return [
      ...baseGoldenCrossFields,
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
        formFields={formFields}
        isLoading={isLoading}
        onSubmit={onSubmit}
      />
      {basketOptions.length === 0 && (
        <p className="text-sm text-slate-500 px-4">
          No baskets available. Create a market/index/favorites basket to start scanning.
        </p>
      )}
      {results && results.data && results.data.length > 0 && (
        <GoldenCrossOutput results={results.data} />
      )}
    </FormCardGenerator>
  );
}
