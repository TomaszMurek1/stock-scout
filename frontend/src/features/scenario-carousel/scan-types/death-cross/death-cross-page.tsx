import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DeathCrossOutput } from "./death-cross-output";
import { ScanResultsProps } from "./death-cross-page.types";
import {
  baseDeathCrossFields,
  deathCrossFormSchema,
  DeathCrossFormValues,
} from "./death-cross-page.helpers";
import { apiClient } from "@/services/apiClient";
import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import BackToCarousel from "@/components/shared/BackToCarousel";
import FormSubtitle from "@/components/shared/forms/FormSubtitle";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import FormFieldsGenerator from "@/components/shared/forms/form-fields-generator";
import { Skull } from "lucide-react";
import { useScanJob } from "@/hooks/useScanJob";

export default function DeathCrossScanPage() {
  const { t } = useTranslation();
  const { startJob, isLoading, result, error, status } = useScanJob<ScanResultsProps['data']>({
    onCompleted: (data) => console.log("Scan completed", data),
  });

  const form = useForm<DeathCrossFormValues>({
    resolver: zodResolver(deathCrossFormSchema),
    defaultValues: {
      shortPeriod: 50,
      longPeriod: 200,
      daysToLookBack: 60,
      basketIds: [],
      minMarketCap: 0,
    },
  });

  const formFields: IFormGeneratorField<DeathCrossFormValues>[] = useMemo(() => {
    return [
      ...baseDeathCrossFields.map(field => ({
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

  const onSubmit: SubmitHandler<DeathCrossFormValues> = (data) => {
    startJob(() =>
      apiClient.post("/technical-analysis/death-cross", {
        short_window: data.shortPeriod,
        long_window: data.longPeriod,
        days_to_look_back: data.daysToLookBack,
        min_volume: 1000000,
        adjusted: false,
        basket_ids: data.basketIds.map((id) => Number(id)),
        min_market_cap: data.minMarketCap,
      })
    );
  };

  return (
    <div className="container">
      <BackToCarousel />
      <FormCardGenerator
        title={t("scans.death_cross.title")}
        icon={Skull}
        subtitle={
          <FormSubtitle description={t("scans.death_cross.subtitle")} />
        }
      >
        <FormFieldsGenerator<DeathCrossFormValues>
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
          <DeathCrossOutput results={result} />
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
