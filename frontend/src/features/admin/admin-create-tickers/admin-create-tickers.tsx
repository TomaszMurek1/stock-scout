import React, { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import FormFieldsGenerator from "@/components/shared/forms/form-fields-generator";
import { ScanResultsProps } from "@/features/scenario-carousel/scan-types/golden-cross/golden-cross-page.types";
import {
  createTickerSchema,
  createTickersFormFields,
  CreateTickerValues,
} from "./admin-create-tickers.helpers";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import { useScanJob } from "@/hooks/useScanJob";
import { apiClient } from "@/services/apiClient";

export default function AdminCreateTickersForm() {
    const { startJob, isLoading, result, error, status } = useScanJob<any>({
        onCompleted: (data) => toast.success("Companies added successfully")
    });

  const form = useForm<CreateTickerValues>({
    resolver: zodResolver(createTickerSchema),
    defaultValues: {
      country: "Poland",
      market: "XWAR",
    },
  });

  const onSubmit: SubmitHandler<CreateTickerValues> = async (data) => {
    startJob(() => 
        apiClient.post("/admin/add-companies-job", {
            market_code: data.market,
            // tickers: ... if we supported manual list, but form seems to focus on whole market
        })
    );
  };
    
  return (
    <FormCardGenerator
      title="Fill Market with Tickers"
      subtitle=" For newly created market fill database with tickers"
    >
      <FormFieldsGenerator
        form={form}
        formFields={createTickersFormFields}
        isLoading={isLoading}
        loadingText={status === "RUNNING" ? "Processing..." : "Submit"}
        onSubmit={onSubmit}
      />
      
      {status === "RUNNING" && <p className="text-sm text-blue-600 animate-pulse mt-2">Job is running in background...</p>}
      {error && <p className="text-sm text-red-600 mt-2">Error: {error}</p>}

      {result && (
           <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>
           </div>
      )}
    </FormCardGenerator>
  );
}
