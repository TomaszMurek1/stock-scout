import React, { useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormFieldsGenerator from "@/components/shared/forms/form-fields-generator";
import {
  GmmaSqueezeFormSchema,
  GmmaSqueezeFormValues,
  GmmaSqueezeFormFields,
} from "./gmma-squeeze-form.helpers";
import { apiClient } from "@/services/apiClient";
import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import { GmmaSqueezeResponse } from "./gmma-squeeze-form.types";
import { GmmaSqueezeOutput } from "./gmma-squeeze-output";
import { useScanJob } from "@/hooks/useScanJob";
import { useGmmaScanStore } from "./gmma-squeeze-store";

const GmmaSqueezeForm: React.FC = () => {
  const { t } = useTranslation();
  const { results: cachedResults, lastScanAt, setResults } = useGmmaScanStore();

  const { startJob, isLoading, result, error, status } = useScanJob<GmmaSqueezeResponse>({
    onCompleted: (data) => console.log("GMMA Squeeze scan completed", data),
  });

  const form = useForm<GmmaSqueezeFormValues>({
    resolver: zodResolver(GmmaSqueezeFormSchema),
    defaultValues: {
      basketIds: [],
      minMarketCap: 100,
      compressionThreshold: 3.0,
      bandWidthThreshold: 5.0,
      starterSmoothing: 3,
      sessionLimit: 200,
      trendFilter: ["up", "down"],
    },
  });

  const formFields: IFormGeneratorField<GmmaSqueezeFormValues>[] = useMemo(() => {
    return [
      ...GmmaSqueezeFormFields.map((field) => ({
        ...field,
        label: t(field.label),
        description: t(field.description || ""),
      })),
      {
        name: "basketIds",
        label: t("scans.common.basket_ids.label"),
        description: t("scans.common.basket_ids.description"),
        type: "basket-chips",
      },
    ];
  }, [t]);

  // Persist new results to zustand store
  const freshResults = Array.isArray(result) ? result : result?.data || [];
  useEffect(() => {
    if (freshResults.length > 0) {
      setResults(freshResults);
    }
  }, [freshResults, setResults]);

  // Use fresh results if available, otherwise fall back to cached
  const displayResults = freshResults.length > 0 ? freshResults : cachedResults;

  const onSubmit: SubmitHandler<GmmaSqueezeFormValues> = (data) => {
    // Convert checkbox array to backend trend_filter string
    const trendArr = data.trendFilter || [];
    let trendFilter = "both";
    if (trendArr.includes("up") && !trendArr.includes("down")) trendFilter = "up";
    else if (trendArr.includes("down") && !trendArr.includes("up")) trendFilter = "down";

    startJob(() =>
      apiClient.post("/technical-analysis/gmma-squeeze", {
        basket_ids: data.basketIds?.map((id) => Number(id)) || [],
        min_market_cap: data.minMarketCap,
        compression_threshold: data.compressionThreshold,
        band_width_threshold: data.bandWidthThreshold,
        starter_smoothing: data.starterSmoothing,
        session_limit: data.sessionLimit,
        trend_filter: trendFilter,
      })
    );
  };

  return (
    <div data-id="gmma-squeeze-form" className="space-y-6">
      <FormFieldsGenerator<GmmaSqueezeFormValues>
        form={form}
        formFields={formFields}
        isLoading={isLoading}
        loadingText={
          status === "RUNNING"
            ? t("scans.common.scanning")
            : t("scans.common.starting")
        }
        onSubmit={onSubmit}
      />

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
          <p>
            {t("scans.common.error")}: {error}
          </p>
        </div>
      )}

      {displayResults.length > 0 && (
        <>
          {lastScanAt && !result && (
            <p className="text-xs text-slate-400 text-right">
              Cached from {new Date(lastScanAt).toLocaleTimeString()}
            </p>
          )}
          <GmmaSqueezeOutput results={displayResults} />
        </>
      )}

      {result && freshResults.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          {t("scans.common.no_results")}
        </div>
      )}
    </div>
  );
};

export default GmmaSqueezeForm;
