import React, { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import FormFieldsGenerator from "@/components/shared/forms/form-fields-generator";
import { ScanResultsProps } from "@/components/scenario-carousel/scan-types/golden-cross-form/golden-cross-form.types";
import {
  createTickerSchema,
  createTickersFormFields,
  CreateTickerValues,
} from "./admin-create-tickers.helpers";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";

export default function AdminCreateTickersForm() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ScanResultsProps | null>(null);

  const form = useForm<CreateTickerValues>({
    resolver: zodResolver(createTickerSchema),
    defaultValues: {
      country: "PL",
      market: "XWAR",
    },
  });

  const onSubmit: SubmitHandler<CreateTickerValues> = async (data) => {
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/abc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: data.country,
          market: data.market,
          min_volume: 1000000,
          adjusted: true,
          markets: ["NYSE"],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "An error occurred during the scan"
        );
      }

      const result: any = await response.json();
      setResults(result);
      console.log("Golden Cross Data:", result.data);
      toast.success("Golden Cross scan completed successfully");
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

  console.log("form", form);

  return (
    <FormCardGenerator
      title="Fill Market with Tickers"
      subtitle=" For newly created market fill database with tickers"
    >
      <FormFieldsGenerator
        form={form}
        formFields={createTickersFormFields}
        isLoading={isLoading}
        onSubmit={onSubmit}
      />

      {results && results.data && results.data.length > 0 && <div>test</div>}
    </FormCardGenerator>
  );
}
