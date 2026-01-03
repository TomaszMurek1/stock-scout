import React, { useMemo } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormFieldsGenerator from "@/components/shared/forms/form-fields-generator";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import { EvToRevenueFormFields, EvToRevenueValues, EvToRevenueFormSchema } from "./ev-to-revenue-page.helpers";
import { EvToRevenueOutput } from "../ev-to-revenue-output/ev-to-revenue-output";
import { EvToRevenueResultsProps } from "../ev-to-revenue-output/ev-to-revenue-output.types";
import { apiClient } from "@/services/apiClient";
import FormSubtitle from "@/components/shared/forms/FormSubtitle";
import BackToCarousel from "@/components/shared/BackToCarousel";
import { BarChart3 } from "lucide-react";
import { useScanJob } from "@/hooks/useScanJob";


export default function EvToRevenueScanForm() {
    const { startJob, isLoading, result, error, status } = useScanJob<EvToRevenueResultsProps>({
        onCompleted: (data) => console.log("EV/Revenue scan completed", data),
    });

  const form = useForm<EvToRevenueValues>({
    resolver: zodResolver(EvToRevenueFormSchema),
    defaultValues: {
      basketIds: [],
      min_ev_to_revenue: 0,
      max_ev_to_revenue: 3,
    },
  });

  const onSubmit: SubmitHandler<EvToRevenueValues> = (data) => {
    startJob(() => 
        apiClient.post(
            "/fundamentals/ev-to-revenue",
            {
              max_ev_to_revenue: data.max_ev_to_revenue,
              min_ev_to_revenue: data.min_ev_to_revenue,
              basket_ids: data.basketIds.map((id) => Number(id)),
            }
        )
    );
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
          loadingText={status === "RUNNING" ? "Fetching data & analyzing..." : "Starting Scan..."}
          onSubmit={onSubmit}
        />
        
        {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                <p>Error: {error}</p>
            </div>
        )}

        {useMemo(() => result && result.data && result.data.length > 0 && (
          <EvToRevenueOutput data={result.data} />
        ), [result])}

        {result && result.data && result.data.length === 0 && (
             <div className="mt-6 text-center text-gray-500">
                No results found matching your criteria.
             </div>
        )}
      </FormCardGenerator>
    </div>
  );
}
