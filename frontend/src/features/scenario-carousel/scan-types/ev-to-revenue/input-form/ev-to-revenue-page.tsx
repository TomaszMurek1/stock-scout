import React, { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormFieldsGenerator from "@/components/shared/forms/form-fields-generator";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import { toast } from "react-toastify";
import { EvToRevenueFormFields, EvToRevenueValues, EvToRevenueFormSchema } from "./ev-to-revenue-page.helpers";
import { EvToRevenueOutput } from "../ev-to-revenue-output/ev-to-revenue-output";
import { EvToRevenueResultsProps } from "../ev-to-revenue-output/ev-to-revenue-output.types";
import { apiClient } from "@/services/apiClient";
import FormSubtitle from "@/components/shared/forms/FormSubtitle";
import BackToCarousel from "@/components/shared/BackToCarousel";
import { BarChart3 } from "lucide-react";


export default function EvToRevenueScanForm() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<EvToRevenueResultsProps | null>(null);

  const form = useForm<EvToRevenueValues>({
    resolver: zodResolver(EvToRevenueFormSchema),
    defaultValues: {
      basketIds: [],
      min_ev_to_revenue: 0,
      max_ev_to_revenue: 3,
    },
  });
  const onSubmit: SubmitHandler<EvToRevenueValues> = async (data) => {
    setIsLoading(true);
    console.log(data);
    try {
      const response = await apiClient.post(
        "/fundamentals/ev-to-revenue",
        {
          max_ev_to_revenue: data.max_ev_to_revenue,
          min_ev_to_revenue: data.min_ev_to_revenue,
          basket_ids: data.basketIds.map((id) => Number(id)),
        }
      );

      const result: EvToRevenueResultsProps = response.data;
      setResults(result);
      toast.success("EV to Revenue scan completed successfully");
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
      title="EV/Revenue Scan"
      icon={BarChart3}
      subtitle={
        <FormSubtitle
          description={
            <>
              Find potentially <strong>undervalued growth stocks</strong> using the Enterprise Value to Revenue (EV/Revenue) ratio.
            </>
          }
          bulletPoints={[
            {
              label: "What it measures",
              description: "How much the market values each dollar of revenue the company generates.",
            },
            {
              label: "Lower ratios (1-3)",
              description: "May indicate undervalued companies with strong revenue growth potential.",
            },
            {
              label: "Higher ratios (5+)",
              description: "Suggest the market expects significant future growth or the stock may be overvalued.",
            },
            {
              label: "Best for",
              description: "Evaluating growth companies, especially in tech and biotech sectors where earnings may be negative.",
            },
          ]}
        />
      }
    >
      <FormFieldsGenerator<EvToRevenueValues>
        form={form}
        formFields={EvToRevenueFormFields}
        isLoading={isLoading}
        onSubmit={onSubmit}
      />
      {results && results.data && results.data.length > 0 && (
        <EvToRevenueOutput data={results.data} />
      )}
    </FormCardGenerator>
    </div>
  );
}
