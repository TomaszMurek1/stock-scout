import React from "react";
import { Controller, SubmitHandler } from "react-hook-form";
import { TextField, Button, Typography, Box } from "@mui/material";
import { GoldenCrossFormFieldsProps } from "./golden-cross-form.types";
import { FormValues } from "./golden-cross-form";

// Helper function to render a form field
interface FormFieldProps {
  name: keyof FormValues;
  label: string;
  description: string;
  control: any;
  type: string;
}

const formFields: {
  name: keyof FormValues;
  label: string;
  description: string;
  type: string;
}[] = [
  {
    name: "shortPeriod",
    label: "Short Period (days)",
    description:
      "The number of days for the short-term moving average (e.g., 50 days).",
    type: "number",
  },
  {
    name: "longPeriod",
    label: "Long Period (days)",
    description:
      "The number of days for the long-term moving average (e.g., 200 days).",
    type: "number",
  },
  {
    name: "daysToLookBack",
    label: "Days to Look Back",
    description:
      "The number of days in the past to analyze for the Golden Cross pattern.",
    type: "number",
  },
];

const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  description,
  control,
  type,
}) => (
  <Controller
    name={name}
    control={control}
    render={({ field }) => (
      <Box className="space-y-1 m-4">
        <Typography
          variant="subtitle1"
          className="text-slate-700 !font-bold flex justify-start"
        >
          {label}
        </Typography>
        <TextField
          size="small"
          variant="outlined"
          fullWidth
          className="bg-zinc-100"
          {...field}
          type={type}
        />
        <Typography
          variant="body2"
          className="text-slate-500 flex justify-start"
        >
          {description}
        </Typography>
      </Box>
    )}
  />
);

const GoldenCrossFormFields: React.FC<GoldenCrossFormFieldsProps> = ({
  form,
  isLoading,
  onSubmit,
}) => {
  // Define the type for the form data fields

  // Update the type of the `handleSubmit` function to match the react-hook-form's SubmitHandler
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
      {formFields.map(({ name, label, description, type }) => (
        <FormField
          key={name}
          name={name}
          label={label}
          description={description}
          control={form.control}
          type={type}
        />
      ))}
      <div className="m-4 pt-8">
        <Button
          type="submit"
          variant="contained"
          fullWidth
          className="bg-slate-700 text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "Scanning..." : "Start Scan"}
        </Button>
      </div>
    </form>
  );
};

export default GoldenCrossFormFields;
