import React, { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormFieldsGenerator from "@/components/shared/forms/form-fields-generator";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import { toast } from "react-toastify";
import { EvToRevenueFormFields, EvToRevenueValues,EvToRevenueFormSchema } from "./ev-to-revenue-page.helpers";
import { EvToRevenueOutput } from "../ev-to-revenue-output/ev-to-revenue-output";
import { EvToRevenueResultsProps } from "../ev-to-revenue-output/ev-to-revenue-output.types";



export default function EvToRevenueScanForm() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<EvToRevenueResultsProps | null>(null);

  const form = useForm<EvToRevenueValues>({
    resolver: zodResolver(EvToRevenueFormSchema),
   
  });
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
  
  const onSubmit: SubmitHandler<EvToRevenueValues> = async (data) => {
    setIsLoading(true);
    console.log(data);
    try {
      const response = await fetch(
        `${API_URL}/fundamentals/ev-to-revenue`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            max_ev_to_revenue: data.max_ev_to_revenue,
            min_ev_to_revenue: data.min_ev_to_revenue,
            markets: data.markets,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "An error occurred during the scan"
        );
      }

      const result: EvToRevenueResultsProps = await response.json();
      setResults(result);
      toast.success("EV to Revenue scan completed successfully");
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Network error. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormCardGenerator
      title="EV/Revenue Scan"
      subtitle={
        <div className="space-y-2">
          <p>
            Find potentially <strong>undervalued growth stocks</strong> using the Enterprise Value to Revenue (EV/Revenue) ratio.
          </p>
          <ul className="list-disc list-inside text-sm text-gray-700 ml-2">
            <li><strong>What it measures:</strong> How much the market values each dollar of revenue the company generates.</li>
            <li><strong>Lower ratios (1-3):</strong> May indicate undervalued companies with strong revenue growth potential.</li>
            <li><strong>Higher ratios (5+):</strong> Suggest the market expects significant future growth or the stock may be overvalued.</li>
            <li><strong>Best for:</strong> Evaluating growth companies, especially in tech and biotech sectors where earnings may be negative.</li>
          </ul>
        </div>
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
  );
}
