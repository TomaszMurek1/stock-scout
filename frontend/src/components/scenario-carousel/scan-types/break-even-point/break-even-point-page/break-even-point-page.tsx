import React, { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormFieldsGenerator from "@/components/shared/forms/form-fields-generator";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import { toast } from "react-toastify";
import { BreakEvenPointFormFields, BreakEvenPointValues,BreakEvenPointFormSchema } from "./break-even-point-page.helpers";
import { BreakEvenPointOutput } from "../break-even-point-output/break-even-point-output";
import { IBreakEvenPointProps } from "../break-even-point-output/break-even-point-output.types";



export default function BreakEvenPointScanForm() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<IBreakEvenPointProps | null>(null);

  const form = useForm<BreakEvenPointValues>({
    resolver: zodResolver(BreakEvenPointFormSchema),
   
  });
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
  
  const onSubmit: SubmitHandler<BreakEvenPointValues> = async (data) => {
    setIsLoading(true);
    console.log(data);
    try {
      const response = await fetch(
        `${API_URL}/fundamentals/break-even-companies?months=12`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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

      const result: IBreakEvenPointProps = await response.json();
      setResults(result);
      console.log("BreakEvenPoint:", result.data);
      toast.success("Break Even Point scan completed successfully");
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
      title="BreakEvenPoint Scan"
      subtitle=" Set parameters to scan for stocks showing a Break Even Point."
    >
      <FormFieldsGenerator<BreakEvenPointValues>
        form={form}
        formFields={BreakEvenPointFormFields}
        isLoading={isLoading}
        onSubmit={onSubmit}
      />
      {results && results.data && results.data.length > 0 && (
        <BreakEvenPointOutput data={results.data} />
      )}
    </FormCardGenerator>
  );
}
