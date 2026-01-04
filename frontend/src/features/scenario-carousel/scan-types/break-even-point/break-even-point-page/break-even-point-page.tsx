import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { Target, TrendingUp } from "lucide-react";
import { useScanJob } from "@/hooks/useScanJob";
import { apiClient } from "@/services/apiClient";

export default function BreakEvenPointPage() {
  const { t } = useTranslation();
  // Using generic array as backup if type not found
  const { startJob, isLoading, result, error, status } = useScanJob<IBreakEvenPointData[]>({
    onCompleted: (data) => console.log("Break Even scan completed", data),
  });
  const [results, setResults] = useState<IBreakEvenPointData[]>([]);
  // const fetchBreakEven = useAppStore((state) => state.fetchBreakEven); // This line is removed by the instruction's context
  // const breakEvenLoading = useAppStore((state) => state.analysis.breakEven.isLoading); // This line is removed by the instruction's context

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
      ...BreakEvenBaseFields.map(field => ({
        ...field,
        label: t(field.label),
        description: t(field.description || "")
      })),
      {
        name: "basketIds",
        label: t("scans.common.basket_ids.label"),
        description: t("scans.common.basket_ids.description"),
        type: "basket-chips",
      },
    ];
  }, [t]);
  
  const onSubmit: SubmitHandler<BreakEvenPointValues> = async (data) => {
    setResults([]);
    try {
      const basketIds = data.basketIds.map((id) => Number(id));
      
      startJob(() => 
        apiClient.post("/technical-analysis/break-even-point", {
            basket_ids: basketIds,
            threshold_pct: data.thresholdPct,
            min_market_cap: data.minMarketCap
        })
      );
      // Result handling is done via useScanJob implicitly updating 'result', or we monitor it.
      // The original code was waiting for result. useScanJob handles loading/error/result state.
      // We can update local state in onCompleted if needed, but 'result' from hook is better source of truth.
      // However, line 70 checks `results` (local state). I should sync them or use hook result.
      // I'll stick to hook result pattern later, but for now just fix the call and update `results` in effect or use `result` directly.
      
    } catch (error: any) {
      console.error("Fetch error:", error);
      toast.error(t("scans.common.error_network"));
    }
  };

  return (
    <div className="container">
      <BackToCarousel />
      <FormCardGenerator
      title={t("scans.break_even_point.title")}
      icon={TrendingUp}
      subtitle={
        <FormSubtitle description={t("scans.break_even_point.subtitle")} />
      }
    >
      <HowItWorksSection />
      <FormFieldsGenerator<BreakEvenPointValues>
        form={form}
        formFields={formFields}
        isLoading={isLoading}
        loadingText={status === "RUNNING" ? t("scans.common.scanning") : t("scans.common.starting")}
        onSubmit={onSubmit}
      />
      {result && result.length > 0 && <BreakEvenPointOutput data={result} />}
      
      {result && result.length === 0 && (
        <div className="text-center text-gray-500 mt-4">
          {t("scans.common.no_results_found")}
        </div>
      )}
    </FormCardGenerator>
    </div>
  );
}
