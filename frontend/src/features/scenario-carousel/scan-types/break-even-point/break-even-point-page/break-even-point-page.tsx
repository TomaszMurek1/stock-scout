import React, { useMemo, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormFieldsGenerator from "@/components/shared/forms/form-fields-generator";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import { toast } from "react-toastify";
import { BreakEvenPointValues, BreakEvenPointFormSchema, BreakEvenBaseFields } from "./break-even-point-page.helpers";
import { BreakEvenPointOutput } from "../break-even-point-output/break-even-point-output";
import { IBreakEvenPointData } from "../break-even-point-output/break-even-point-output.types";
import { useAppStore } from "@/store/appStore";
import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import BackToCarousel from "@/components/shared/BackToCarousel";
import FormSubtitle from "@/components/shared/forms/FormSubtitle";
import { HowItWorksSection } from "./HowItWorks";
import { Target } from "lucide-react";

export default function BreakEvenPointScanForm() {
  const [results, setResults] = useState<IBreakEvenPointData[]>([]);
  const fetchBreakEven = useAppStore((state) => state.fetchBreakEven);
  const breakEvenLoading = useAppStore((state) => state.analysis.breakEven.isLoading);

  const form = useForm<BreakEvenPointValues>({
    resolver: zodResolver(BreakEvenPointFormSchema),
    defaultValues: {
      basketIds: [],
      thresholdPct: 5,
      minMarketCap: 100,
    },
  });

  const formFields: IFormGeneratorField<BreakEvenPointValues>[] = useMemo(() => {
    return [
      ...BreakEvenBaseFields,
      {
        name: "basketIds",
        label: "Select baskets",
        description: "Choose one or more baskets to scan.",
        type: "basket-chips",
      },
    ];
  }, []);
  
  const onSubmit: SubmitHandler<BreakEvenPointValues> = async (data) => {
    setResults([]);
    try {
      const basketIds = data.basketIds.map((id) => Number(id));
      const result = await fetchBreakEven(basketIds, data.thresholdPct, data.minMarketCap);
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
    <div className="container">
      <BackToCarousel />
      <FormCardGenerator
      title="BreakEvenPoint Scan"
      icon={Target}
      subtitle={
        <FormSubtitle description="Set parameters to scan for stocks showing a Break Even Point." />
      }
    >
      <HowItWorksSection />
      <FormFieldsGenerator<BreakEvenPointValues>
        form={form}
        formFields={formFields}
        isLoading={breakEvenLoading}
        onSubmit={onSubmit}
      />
      {results.length > 0 && <BreakEvenPointOutput data={results} />}
    </FormCardGenerator>
    </div>
  );
}
