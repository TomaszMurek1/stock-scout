import React, { useMemo, useState } from "react";
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

export default function WyckoffScanPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<IWyckoffData[] | null>(null);
  const [weightsExpanded, setWeightsExpanded] = useState(false);

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
    return [
      ...basicWyckoffFields,
      {
        name: "basketIds",
        label: "Select baskets",
        description: "Choose one or more baskets to define the scan universe.",
        type: "basket-chips",
      },
    ];
  }, []);

  const onSubmit: SubmitHandler<WyckoffFormValues> = async (data) => {
    setIsLoading(true);
    setResults(null);
    try {
      const response = await apiClient.post(
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
      );

      if (response.data.status === "success") {
        setResults(response.data.data);
        if (response.data.data.length === 0) {
          toast.info("No matches found above the score threshold.");
        } else {
          toast.success(`Found ${response.data.data.length} accumulation candidates!`);
        }
      } else {
        toast.error("Scan failed.");
      }
      
    } catch (error: any) {
      console.error("API error:", error);
      const errorMessage = error.response?.data?.detail
        || error.message
        || "Network error. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <BackToCarousel />
      <FormCardGenerator
        title="Wyckoff Accumulation Scanner"
        icon={Activity}
        subtitle={
          <FormSubtitle
            description={
              <>
                Detect <strong>accumulation phase patterns</strong> using observable price and volume evidence, inspired by Richard Wyckoff's methodology.
              </>
            }
            bulletPoints={[
              {
                label: "Scoring Approach",
                description: "Each stock receives scores (0-100%) for: Trading Range, Volume Pattern, Spring, Support Tests, and Signs of Strength.",
              },
              {
                label: "Evidence-Based",
                description: "Analysis focuses on observable market facts without claiming to understand institutional intent.",
              },
              {
                label: "Phase Detection",
                description: "Identifies which Wyckoff accumulation phase (B or C) the pattern most closely resembles.",
              },
              {
                label: "Customizable Weights",
                description: "Adjust the importance of each criterion below. Weights must sum to 100%.",
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
              <span className="font-semibold text-gray-900">Advanced: Customize Criterion Weights</span>
              <span className="text-xs text-gray-500">(Default: 25%, 25%, 20%, 15%, 15%)</span>
            </div>
            {weightsExpanded ? <ChevronUp size={20} className="text-gray-600" /> : <ChevronDown size={20} className="text-gray-600" />}
          </button>

          {weightsExpanded && (
            <div className="px-4 pb-4 space-y-4">
              <p className="text-sm text-gray-600">
                Adjust the importance of each criterion. <strong>Weights must sum to 100%</strong>.
              </p>
              
              {/* Weight Total Indicator */}
              <div className={`p-3 rounded-lg border-2 ${
                Math.abs(totalWeight - 100) < 0.1 
                  ? 'bg-green-50 border-green-500' 
                  : 'bg-red-50 border-red-500'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">
                    Total Weight: 
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
                    Weights must sum to exactly 100%. Currently {totalWeight > 100 ? 'over' : 'under'} by {Math.abs(totalWeight - 100).toFixed(1)}%.
                  </p>
                )}
              </div>

              {/* Weight Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {weightFields.map((field) => (
                  <div key={field.name as string}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                    </label>
                    <input
                      type="number"
                      {...form.register(field.name as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {field.description && (
                      <p className="text-xs text-gray-500 mt-1">{field.description}</p>
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
          onSubmit={onSubmit}
        />
        
        {/* Results - Memoized to prevent re-render on form changes */}
        {useMemo(() => results && results.length > 0 && <WyckoffOutput results={results} />, [results])}
      </FormCardGenerator>
    </div>
  );
}
