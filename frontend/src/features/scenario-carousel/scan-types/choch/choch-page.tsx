import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      ...baseChochFields.map(field => ({
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
      {
        name: "minMarketCap",
        label: t("scans.common.min_market_cap.label"),
        description: t("scans.common.min_market_cap.description"),
        type: "number",
      },
    ];
  }, [t]);

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
        title={t("scans.choch.title")}
        icon={Zap}
        subtitle={
          <FormSubtitle description={t("scans.choch.subtitle")} />
        }
      >
        <FormFieldsGenerator<ChochFormValues>
          form={form}
          formFields={formFields}
          isLoading={isLoading}
          loadingText={status === "RUNNING" ? t("scans.common.scanning") : t("scans.common.starting")}
          onSubmit={onSubmit}
        />
        
        {/* Error Message */}
        {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                <p>{t("scans.common.error")}: {error}</p>
            </div>
        )}

        {/* Results */}
        {useMemo(() => result && result.length > 0 && (
          <ChochOutput results={result} />
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
