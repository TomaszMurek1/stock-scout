import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import {
  basicWyckoffFields,
  weightFields,
  wyckoffFormSchema,
  WyckoffFormValues,
} from "./wyckoff-page.helpers";
import { WyckoffOutput, IWyckoffData } from "./wyckoff-output";
import { apiClient } from "@/services/apiClient";
import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import BackToCarousel from "@/components/shared/BackToCarousel";
import FormSubtitle from "@/components/shared/forms/FormSubtitle";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import FormFieldsGenerator from "@/components/shared/forms/form-fields-generator";
import { HowItWorksSection } from "./HowItWorks";
import { ChevronDown, ChevronUp, Settings, Activity } from "lucide-react";
import { useScanJob } from "@/hooks/useScanJob";

export default function WyckoffScanPage() {
  const [weightsExpanded, setWeightsExpanded] = useState(false);
  const { t } = useTranslation();
  const { startJob, isLoading, result, error, status, jobId } = useScanJob<IWyckoffData[]>({
      onCompleted: (data) => {
          if (data.length === 0) {
              toast.info(t("scans.common.no_matches_found"));
          } else {
              toast.success(t("scans.common.accumulation_candidates_found", { count: data.length }));
          }
      }
  });

  const form = useForm<WyckoffFormValues>({
    resolver: zodResolver(wyckoffFormSchema),
    defaultValues: {
      lookbackDays: 90,
      basketIds: [],
      minMarketCap: 500, // Default: 500 million USD ($500M)
      minScore: 60,
      // Default weights (sum to 100)
      weightTradingRange: 25,
      weightVolumePattern: 25,
      weightSpring: 20,
      weightSupportTests: 15,
      weightSignsOfStrength: 15,
    },
  });

  // Calculate total weight for visual feedback
  const weightValues = form.watch(["weightTradingRange", "weightVolumePattern", "weightSpring", "weightSupportTests", "weightSignsOfStrength"]);
  const totalWeight = weightValues.reduce((sum, val) => sum + (Number(val) || 0), 0);

  const formFields: IFormGeneratorField<WyckoffFormValues>[] = useMemo(() => {
    // Translate basic fields
    const translatedBasicFields = basicWyckoffFields.map(field => ({
        ...field,
        label: t(field.label),
        description: t(field.description || "")
    }));

    return [
      ...translatedBasicFields,
      {
        name: "basketIds",
        label: t("scans.common.basket_ids.label"),
        description: t("scans.common.basket_ids.description"),
        type: "basket-chips",
      },
    ];
  }, [t]);

  const onSubmit: SubmitHandler<WyckoffFormValues> = (data) => {
    startJob(() =>
      apiClient.post(
        "/technical-analysis/wyckoff",
        {
          lookback_days: data.lookbackDays,
          basket_ids: data.basketIds?.map((id) => Number(id)) || [],
          min_market_cap: data.minMarketCap,
          min_score: data.minScore,
          weights: {
            trading_range: data.weightTradingRange,
            volume_pattern: data.weightVolumePattern,
            spring: data.weightSpring,
            support_tests: data.weightSupportTests,
            signs_of_strength: data.weightSignsOfStrength,
          },
        }
      )
    );
  };

  return (
    <div className="container">
      <BackToCarousel />
      <FormCardGenerator
        title={t("scans.wyckoff.title")}
        icon={Activity}
        subtitle={
          <FormSubtitle
            description={
              <>
                {t("scans.wyckoff.subtitle_description_part1")} <strong>{t("scans.wyckoff.subtitle_description_strong")}</strong> {t("scans.wyckoff.subtitle_description_part2")}
              </>
            }
            bulletPoints={[
              {
                label: t("scans.wyckoff.bullet1_label"),
                description: t("scans.wyckoff.bullet1_description"),
              },
              {
                label: t("scans.wyckoff.bullet2_label"),
                description: t("scans.wyckoff.bullet2_description"),
              },
              {
                label: t("scans.wyckoff.bullet3_label"),
                description: t("scans.wyckoff.bullet3_description"),
              },
              {
                label: t("scans.wyckoff.bullet4_label"),
                description: t("scans.wyckoff.bullet4_description"),
              },
            ]}
          />
        }
      >
        <HowItWorksSection />
        
        {/* Expandable Weights Section */}
        <div className="mb-6 border border-gray-300 rounded-lg bg-gray-50">
          <button
            type="button"
            onClick={() => setWeightsExpanded(!weightsExpanded)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 transition-colors rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Settings className="text-gray-600" size={20} />
              <span className="font-semibold text-gray-900">{t("scans.wyckoff.advanced_weights_title")}</span>
              <span className="text-xs text-gray-500">{t("scans.wyckoff.advanced_weights_default")}</span>
            </div>
            {weightsExpanded ? <ChevronUp size={20} className="text-gray-600" /> : <ChevronDown size={20} className="text-gray-600" />}
          </button>

          {weightsExpanded && (
            <div className="px-4 pb-4 space-y-4">
              <p className="text-sm text-gray-600">
                {t("scans.wyckoff.weights_sum_description_part1")} <strong>{t("scans.wyckoff.weights_sum_description_strong")}</strong>{t("scans.wyckoff.weights_sum_description_part2")}
              </p>
              
              {/* Weight Total Indicator */}
              <div className={`p-3 rounded-lg border-2 ${
                Math.abs(totalWeight - 100) < 0.1 
                  ? 'bg-green-50 border-green-500' 
                  : 'bg-red-50 border-red-500'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">
                    {t("scans.wyckoff.total_weight_label")}: 
                  </span>
                  <span className={`text-lg font-bold ${
                    Math.abs(totalWeight - 100) < 0.1 
                      ? 'text-green-700' 
                      : 'text-red-700'
                  }`}>
                    {totalWeight.toFixed(1)}% {Math.abs(totalWeight - 100) < 0.1 ? '✓' : '✗'}
                  </span>
                </div>
                {Math.abs(totalWeight - 100) >= 0.1 && (
                  <p className="text-xs text-red-600 mt-1">
                    {t("scans.wyckoff.weights_error_message", {
                      totalWeight: totalWeight.toFixed(1),
                      difference: Math.abs(totalWeight - 100).toFixed(1),
                      status: totalWeight > 100 ? t("scans.wyckoff.weights_error_over") : t("scans.wyckoff.weights_error_under")
                    })}
                  </p>
                )}
              </div>

              {/* Weight Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {weightFields.map((field) => (
                  <div key={field.name as string}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t(field.label)}
                    </label>
                    <input
                      type="number"
                      {...form.register(field.name as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {field.description && (
                      <p className="text-xs text-gray-500 mt-1">{t(field.description)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <FormFieldsGenerator<WyckoffFormValues>
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
        {useMemo(() => result && result.length > 0 && <WyckoffOutput results={result} />, [result])}
        {result && result.length === 0 && (
             <div className="mt-6 text-center text-gray-500">
                {t("scans.common.no_results")}
             </div>
        )}
      </FormCardGenerator>
    </div>
  );
}
