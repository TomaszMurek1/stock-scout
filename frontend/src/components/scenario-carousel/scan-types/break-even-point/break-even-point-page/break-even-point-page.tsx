import React, { useEffect, useMemo, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormFieldsGenerator from "@/components/shared/forms/form-fields-generator";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import { toast } from "react-toastify";
import { BreakEvenPointValues, BreakEvenPointFormSchema, BreakEvenBaseFields } from "./break-even-point-page.helpers";
import { BreakEvenPointOutput } from "../break-even-point-output/break-even-point-output";
import { IBreakEvenPointData } from "../break-even-point-output/break-even-point-output.types";
import { apiClient } from "@/services/apiClient";
import { useAppStore } from "@/store/appStore";
import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";

export default function BreakEvenPointScanForm() {
  const [results, setResults] = useState<IBreakEvenPointData[]>([]);
  const [basketOptions, setBasketOptions] = useState<{ id: number; name: string; type: string }[]>([]);
  const fetchBreakEven = useAppStore((state) => state.fetchBreakEven);
  const breakEvenLoading = useAppStore((state) => state.analysis.breakEven.isLoading);

  const form = useForm<BreakEvenPointValues>({
    resolver: zodResolver(BreakEvenPointFormSchema),
    defaultValues: {
      basketIds: [],
      thresholdPct: 5,
    },
  });

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

  const formFields: IFormGeneratorField<BreakEvenPointValues>[] = useMemo(() => {
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
    setResults([]);
    try {
      const basketIds = data.basketIds.map((id) => Number(id));
      const result = await fetchBreakEven(basketIds, data.thresholdPct);
      setResults(result);
      toast.success("Break Even Point scan completed successfully");
    } catch (error: any) {
      console.error("Fetch error:", error);
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        "Network error. Please try again.";
      toast.error(message);
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
        isLoading={breakEvenLoading}
        onSubmit={onSubmit}
      />
      {basketOptions.length === 0 && (
        <p className="text-sm text-slate-500 px-4">No baskets available. Add baskets to start scanning.</p>
      )}
      {results.length > 0 && <BreakEvenPointOutput data={results} />}
    </FormCardGenerator>
  );
}
