import React, { useMemo, useState, useEffect } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { z } from "zod";
import { apiClient } from "@/services/apiClient";
import { IFormGeneratorField } from "@/components/shared/forms/form-field-generator.types";
import BackToCarousel from "@/components/shared/BackToCarousel";
import FormSubtitle from "@/components/shared/forms/FormSubtitle";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import FormFieldsGenerator from "@/components/shared/forms/form-fields-generator";
import { FiboWaveOutput } from "./fibonacci-elliott-output";
import { HowItWorksSection } from "./HowItWorks";
import { useAppStore, AppState } from "@/store/appStore";
import { Waves } from "lucide-react";

// Form Schema
export const fiboWaveFormSchema = z.object({
  basketIds: z.array(z.string()).nonempty("Select at least one basket"),
  minMarketCap: z.coerce.number().min(0).optional(),
  pivotThreshold: z.coerce.number().min(0.01).max(0.2),
  minKellyFraction: z.coerce.number().min(0).max(1),
});

export type FiboWaveFormValues = z.infer<typeof fiboWaveFormSchema>;

// Results interface
interface FiboWaveResult {
  ticker: string;
  company_name: string;
  kelly_fraction: number;
  wave_count: number;
  pivot_count: number;
  last_wave?: string;
}

interface ScanResultsProps {
  data: FiboWaveResult[];
}

export default function FibonacciElliottScanPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Use Zustand store
  const scanResults = useAppStore((state: AppState) => state.fibonacciElliott.scanResults);
  const setScanResults = useAppStore((state: AppState) => state.setScanResults);
  const setScanParams = useAppStore((state: AppState) => state.setScanParams);
  const clearScanResults = useAppStore((state: AppState) => state.clearScanResults);

  const form = useForm<FiboWaveFormValues>({
    resolver: zodResolver(fiboWaveFormSchema),
    defaultValues: {
      basketIds: [],
      minMarketCap: 0,
      pivotThreshold: 0.05,
      minKellyFraction: 0.2,
    },
  });

  const formFields: IFormGeneratorField<FiboWaveFormValues>[] = useMemo(() => {
    return [
      {
        name: "basketIds",
        label: "Select baskets",
        description: "Choose one or more baskets to define the scan universe.",
        type: "basket-chips",
      },
      {
        name: "minMarketCap",
        label: "Minimum Market Cap (USD)",
        description: "Filter stocks by minimum market capitalization",
        type: "number",
        inputProps: {
          min: 0,
          placeholder: "0",
        },
      },
      {
        name: "pivotThreshold",
        label: "Pivot Threshold (%)",
        description: "Percentage threshold for detecting price pivots (1-20%)",
        type: "number",
        inputProps: {
          min: 0.01,
          max: 0.2,
          step: 0.01,
          placeholder: "0.05",
        },
      },
      {
        name: "minKellyFraction",
        label: "Minimum Kelly Fraction",
        description: "Filter results by minimum Kelly Fraction (0-1)",
        type: "number",
        inputProps: {
          min: 0,
          max: 1,
          step: 0.05,
          placeholder: "0.2",
        },
      },
    ];
  }, []);

  // Clear results when navigating away from fibonacci-elliott routes
  useEffect(() => {
    return () => {
      // On unmount, check if we're still within fibonacci-elliott routes
      // Use a small timeout to let React Router update the location
      setTimeout(() => {
        const currentPath = window.location.pathname;
        const isFibonacciRoute = currentPath.startsWith('/scenarios/fibonacci-elliott');
        
        if (!isFibonacciRoute) {
          // We've left the fibonacci-elliott routes - clear results
          clearScanResults();
        }
      }, 0);
    };
  }, [clearScanResults]);

  const onSubmit: SubmitHandler<FiboWaveFormValues> = async (data) => {
    setIsLoading(true);
    setScanResults(null); // Clear previous results while loading
    
    // Save params to store for the chart view
    setScanParams({
      pivotThreshold: data.pivotThreshold
    });

    try {
      const response = await apiClient.post(
        "/fibo-waves/scan",
        {
          basket_ids: data.basketIds.map((id) => Number(id)),
          min_market_cap: data.minMarketCap || 0,
          pivot_threshold: data.pivotThreshold,
          min_kelly_fraction: data.minKellyFraction,
        }
      );

      const result: ScanResultsProps = response.data;
      setScanResults(result.data);

      console.log("Fibonacci & Elliott Scan Data:", result.data);
      if (result.data.length === 0) {
        toast.info("No matches found given the criteria.");
      } else {
        toast.success(`Found ${result.data.length} stocks with Elliott Wave patterns`);
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
        title="Fibonacci & Elliott Wave Scan"
        icon={Waves}
        subtitle={
          <FormSubtitle description="Scan for stocks showing Elliott Wave patterns with Fibonacci retracements." />
        }
        maxWidth="max-w-4xl"
      >
        <HowItWorksSection />
        <FormFieldsGenerator<FiboWaveFormValues>
          form={form}
          formFields={formFields}
          isLoading={isLoading}
          onSubmit={onSubmit}
        />
      </FormCardGenerator>
      
      {/* Results outside form - matching card styling */}
      {useMemo(() => scanResults && scanResults.length > 0 && (
        <div className="w-full max-w-4xl mx-auto">
          <FiboWaveOutput results={scanResults} />
        </div>
      ), [scanResults])}
    </div>
  );
}
