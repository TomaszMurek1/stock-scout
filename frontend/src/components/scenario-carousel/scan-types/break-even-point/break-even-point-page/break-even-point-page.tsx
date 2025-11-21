import React, { useEffect, useMemo, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormFieldsGenerator from "@/components/shared/forms/form-fields-generator";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import { toast } from "react-toastify";
import { BreakEvenPointValues,BreakEvenPointFormSchema, BreakEvenBaseFields } from "./break-even-point-page.helpers";
import { BreakEvenPointOutput } from "../break-even-point-output/break-even-point-output";
import { IBreakEvenPointProps } from "../break-even-point-output/break-even-point-output.types";
import { apiClient } from "@/services/apiClient";



export default function BreakEvenPointScanForm() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<IBreakEvenPointProps | null>(null);
  const [basketOptions, setBasketOptions] = useState<{ id: number; name: string; type: string }[]>([]);

  const form = useForm<BreakEvenPointValues>({
    resolver: zodResolver(BreakEvenPointFormSchema),
    defaultValues: {
      basketIds: [],
    },
   
  });
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

  useEffect(() => {
    const loadBaskets = async () => {
      try {
        const { data } = await apiClient.get("/baskets");
        setBasketOptions(data || []);
      } catch (error) {
        console.error("Failed to load baskets", error);
        toast.error("Unable to load baskets. Please try again later.");
      }
    };
    loadBaskets();
  }, []);

  const formFields = useMemo(() => {
    return [
      ...BreakEvenBaseFields,
      {
        name: "basketIds",
        label: "Select baskets",
        description: "Choose one or more baskets to scan.",
        type: "checkbox",
        options: basketOptions.map((basket) => ({
          label: `${basket.name} (${basket.type})`,
          value: String(basket.id),
        })),
      },
    ];
  }, [basketOptions]);
  
  const onSubmit: SubmitHandler<BreakEvenPointValues> = async (data) => {
    setResults(null)
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/fundamentals/break-even-companies?months=12`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            basket_ids: data.basketIds.map((id) => Number(id)),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "An error occurred during the scan"
        );
      }

      const result: IBreakEvenPointProps = await response.json();
      setResults(result);
      toast.success("Break Even Point scan completed successfully");
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Network error. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormCardGenerator
      title="BreakEvenPoint Scan"
      subtitle=" Set parameters to scan for stocks showing a Break Even Point."
    >
      <FormFieldsGenerator<BreakEvenPointValues>
        form={form}
        formFields={formFields}
        isLoading={isLoading}
        onSubmit={onSubmit}
      />
      {basketOptions.length === 0 && (
        <p className="text-sm text-slate-500 px-4">No baskets available. Add baskets to start scanning.</p>
      )}
      {results && results.data && results.data.length > 0 && (
        <BreakEvenPointOutput data={results.data} />
      )}
    </FormCardGenerator>
  );
}
