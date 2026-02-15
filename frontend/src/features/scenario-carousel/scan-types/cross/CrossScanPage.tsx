import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LucideIcon } from "lucide-react";
import { CrossScanOutput } from "./CrossScanOutput";
import { CrossScanResultsProps } from "./cross-scan.types";
import {
  baseCrossScanFields,
  crossScanFormSchema,
  CrossScanFormValues,
} from "./cross-scan.helpers";
import { apiClient } from "@/services/apiClient";
import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import BackToCarousel from "@/components/shared/BackToCarousel";
import FormSubtitle from "@/components/shared/forms/FormSubtitle";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import FormFieldsGenerator from "@/components/shared/forms/form-fields-generator";
import { useScanJob } from "@/hooks/useScanJob";

interface CrossScanPageProps {
  /** "golden" or "death" */
  crossType: "golden" | "death";
  /** Lucide icon component */
  icon: LucideIcon;
  /** CSS class for date color in results, e.g. "text-green-700" */
  dateColorClass: string;
  /** i18n prefix, e.g. "scans.golden_cross" */
  i18nPrefix: string;
  /** API endpoint path, e.g. "/technical-analysis/golden-cross" */
  endpoint: string;
}

export default function CrossScanPage({
  crossType,
  icon,
  dateColorClass,
  i18nPrefix,
  endpoint,
}: CrossScanPageProps) {
  const { t } = useTranslation();
  const { startJob, isLoading, result, error, status } = useScanJob<CrossScanResultsProps['data']>({
    onCompleted: (data) => console.log(`${crossType}-cross scan completed`, data),
  });

  const form = useForm<CrossScanFormValues>({
    resolver: zodResolver(crossScanFormSchema),
    defaultValues: {
      shortPeriod: 50,
      longPeriod: 200,
      daysToLookBack: 60,
      basketIds: [],
      minMarketCap: 0,
    },
  });

  const formFields: IFormGeneratorField<CrossScanFormValues>[] = useMemo(() => {
    return [
      ...baseCrossScanFields.map(field => ({
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

  const onSubmit: SubmitHandler<CrossScanFormValues> = (data) => {
    startJob(() =>
      apiClient.post(endpoint, {
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
        title={t(`${i18nPrefix}.title`)}
        icon={icon}
        subtitle={
          <FormSubtitle description={t(`${i18nPrefix}.subtitle`)} />
        }
      >
        <FormFieldsGenerator<CrossScanFormValues>
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
          <CrossScanOutput results={result} dateColorClass={dateColorClass} />
        ), [result, dateColorClass])}
        
        {result && result.length === 0 && (
             <div className="mt-6 text-center text-gray-500">
                {t("scans.common.no_results")}
             </div>
        )}

      </FormCardGenerator>
    </div>
  );
}
