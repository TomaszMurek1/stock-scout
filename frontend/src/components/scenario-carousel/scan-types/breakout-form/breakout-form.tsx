import React, { useEffect, useMemo, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormFieldsGenerator from "@/components/shared/forms/form-fields-generator";
import { toast } from "react-toastify";
import {
  BreakoutFormSchema,
  BreakoutFormValues,
  BreakoutFormFields,
} from "./breakout-form.helpers";
import { apiClient } from "@/services/apiClient";
import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import { BreakoutScanResponse, IBreakoutResultItem } from "./breakout-form.types";
import { BreakoutOutput } from "./breakout-output";

interface BasketOption {
  id: number;
  name: string;
  type: string;
}

const BreakoutForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [basketOptions, setBasketOptions] = useState<BasketOption[]>([]);
  const [results, setResults] = useState<IBreakoutResultItem[]>([]);

  const form = useForm<BreakoutFormValues>({
    resolver: zodResolver(BreakoutFormSchema),
    defaultValues: {
      consolidationPeriod: 20,
      thresholdPercentage: 5,
      basketIds: [],
      minMarketCap: 0,
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

  const formFields: IFormGeneratorField<BreakoutFormValues>[] = useMemo(() => {
    return [
      ...BreakoutFormFields,
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

  const onSubmit: SubmitHandler<BreakoutFormValues> = async (data) => {
    setIsLoading(true);
    setResults([]); // Clear previous results
    
    try {
      const response = await apiClient.post<BreakoutScanResponse>(
        "/technical-analysis/breakout",
        {
          consolidation_period: data.consolidationPeriod,
          threshold_percentage: data.thresholdPercentage,
          basket_ids: data.basketIds?.map((id) => Number(id)) || [],
          min_market_cap: data.minMarketCap,
        }
      );

      const scanData = response.data.data || [];
      setResults(scanData);
      
      if (scanData.length > 0) {
          toast.success(`Scan completed! Found ${scanData.length} matches.`);
      } else {
          toast.info("Scan completed. No breakout candidates found with current criteria.");
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
    <div className="space-y-6">
      <FormFieldsGenerator<BreakoutFormValues>
        form={form}
        formFields={formFields} 
        isLoading={isLoading}
        onSubmit={onSubmit}
      />
      {results.length > 0 && <BreakoutOutput results={results} />}
    </div>
  );
};

export default BreakoutForm;
