
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { fxBatchSchema, FxBatchValues, defaultFxBatchValues } from "./admin-fx-batch.helpers";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import { TextField, IconButton, Button as MuiButton, CircularProgress } from "@mui/material";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useFxRates } from "@/hooks/useFxRates";
import { useEffect } from "react";

export default function AdminFxBatchForm() {
  const { getFxRatesBatch, loading, error, data: results } = useFxRates();

  const form = useForm<FxBatchValues>({
    resolver: zodResolver(fxBatchSchema),
    defaultValues: defaultFxBatchValues,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "pairs",
  });

  useEffect(() => {
    if (error) {
      toast.error(error.message);
    }
    if (results) {
      toast.success("FX rates fetched successfully");
    }
  }, [error, results]);

  const onSubmit = async (values: FxBatchValues) => {
    const payload = values.pairs.map((pair) => ({
      base: pair.base.trim().toUpperCase(),
      quote: pair.quote.trim().toUpperCase(),
    }));

    await getFxRatesBatch(payload, values.start, values.end);
  };

  const formatClose = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) {
      return "—";
    }
    const numeric = typeof value === "string" ? parseFloat(value) : value;
    if (Number.isNaN(numeric)) {
      return "—";
    }
    return numeric.toFixed(4);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <FormCardGenerator
        title="Batch FX Rates"
        subtitle="Fetch new FX history for multiple currency pairs without overwriting existing records."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Controller
              name="start"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Start date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  helperText="Optional. Leave empty to auto-select."
                  fullWidth
                  size="small"
                />
              )}
            />
            <Controller
              name="end"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="End date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  helperText="Optional. Defaults to today."
                  fullWidth
                  size="small"
                />
              )}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Currency pairs</h3>
              <MuiButton
                type="button"
                variant="outlined"
                startIcon={<Plus size={16} />}
                onClick={() => append({ base: "", quote: "" })}
              >
                Add pair
              </MuiButton>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid md:grid-cols-2 gap-4 items-start">
                <Controller
                  name={`pairs.${index}.base`}
                  control={control}
                  render={({ field: baseField }) => (
                    <TextField
                      {...baseField}
                      label="Base currency"
                      placeholder="USD"
                      size="small"
                      fullWidth
                      error={!!errors.pairs?.[index]?.base}
                      helperText={errors.pairs?.[index]?.base?.message}
                    />
                  )}
                />
                <div className="flex gap-2">
                  <Controller
                    name={`pairs.${index}.quote`}
                    control={control}
                    render={({ field: quoteField }) => (
                      <TextField
                        {...quoteField}
                        label="Quote currency"
                        placeholder="PLN"
                        size="small"
                        fullWidth
                        error={!!errors.pairs?.[index]?.quote}
                        helperText={errors.pairs?.[index]?.quote?.message}
                      />
                    )}
                  />
                  <IconButton
                    aria-label="Remove pair"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    size="small"
                  >
                    <Trash2 className="w-4 h-4" />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>

          <div>
            <MuiButton
              type="submit"
              variant="contained"
              className="bg-slate-700 hover:bg-slate-800"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {loading ? "Fetching..." : "Fetch FX rates"}
            </MuiButton>
          </div>
        </form>

        {results && (
          <div className="mt-8 space-y-6">
            {Object.entries(results).map(([key, data]) => (
              <div key={key} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {data.base} / {data.quote}
                    </p>
                    <p className="text-sm text-slate-500">
                      {data.historicalData.length} data points
                    </p>
                    {data.note && <p className="text-sm text-amber-600 mt-1">{data.note}</p>}
                  </div>
                  <p className="text-sm text-slate-500">
                    Showing latest {Math.min(5, data.historicalData.length)} entries
                  </p>
                </div>
                {data.historicalData.length === 0 ? (
                  <p className="text-sm text-slate-500">No historical data returned.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 border-b">
                          <th className="py-1">Date</th>
                          <th className="py-1 text-right">Close</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.historicalData.slice(-5).map((row) => (
                          <tr key={`${key}-${row.date}`} className="border-b last:border-0">
                            <td className="py-1">{row.date}</td>
                            <td className="py-1 text-right">
                              {formatClose(row.close)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </FormCardGenerator>
    </div>
  );
}
