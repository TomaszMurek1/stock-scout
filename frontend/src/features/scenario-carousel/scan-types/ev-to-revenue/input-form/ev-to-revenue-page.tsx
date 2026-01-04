import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormFieldsGenerator from "@/components/shared/forms/form-fields-generator";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import { EvToRevenueFormFields, EvToRevenueValues, EvToRevenueFormSchema } from "./ev-to-revenue-page.helpers";
import { EvToRevenueOutput } from "../ev-to-revenue-output/ev-to-revenue-output";
import { apiClient } from "@/services/apiClient";
import FormSubtitle from "@/components/shared/forms/FormSubtitle";
import BackToCarousel from "@/components/shared/BackToCarousel";
import { BarChart3 } from "lucide-react";
import { useScanJob } from "@/hooks/useScanJob";
import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import { IEvToRevenueData } from "../ev-to-revenue-output/ev-to-revenue-output.types";

export default function EvToRevenuePage() {
    const { t } = useTranslation();
    const { startJob, isLoading, result, error, status } = useScanJob<IEvToRevenueData[]>({
        onCompleted: (data) => console.log("EV scan completed", data),
    });

  const form = useForm<EvToRevenueValues>({
    resolver: zodResolver(EvToRevenueFormSchema),
    defaultValues: {
      min_ev_to_revenue: 0,
       max_ev_to_revenue: 3,
      basketIds: [],
    },
  });

  const onSubmit: SubmitHandler<EvToRevenueValues> = (data) => {
    startJob(() =>
      apiClient.post("/technical-analysis/ev-to-revenue", {
        basket_ids: data.basketIds.map((id) => Number(id)),
        min_ev_to_revenue: data.min_ev_to_revenue,
        max_ev_to_revenue: data.max_ev_to_revenue,
      })
    );
  };

  const formFields: IFormGeneratorField<EvToRevenueValues>[] = useMemo(() => {
    return EvToRevenueFormFields.map(field => ({
        ...field,
        label: t(field.label),
        description: t(field.description || "")
    }));
  }, [t]);

  return (
    <div className="container">
      <BackToCarousel />
      <FormCardGenerator
        title={t("scans.ev_to_revenue.title")}
        icon={BarChart3}
        subtitle={
          <FormSubtitle description={t("scans.ev_to_revenue.subtitle")} />
        }
      >
        <FormFieldsGenerator<EvToRevenueValues>
          form={form}
          formFields={formFields}
          isLoading={isLoading}
          loadingText={status === "RUNNING" ? "Fetching data & analyzing..." : "Starting Scan..."}
          onSubmit={onSubmit}
        />
        
        {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                <p>{t("scans.common.error")}: {error}</p>
            </div>
        )}

        {useMemo(() => result && result.length > 0 && (
          <EvToRevenueOutput data={result} />
        ), [result])}

        {result && result.length === 0 && (
             <div className="mt-6 text-center text-gray-500">
                {t("scans.common.no_results")}
             </div>
        )}
      </FormCardGenerator>
    </div>
  );
}
