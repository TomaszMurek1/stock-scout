import React from "react";
import {
  Controller,
  UseFormReturn,
  SubmitHandler,
  FieldValues,
  Control,
  Path,
} from "react-hook-form";
import { TextField, Button, Typography, Box } from "@mui/material";
import { IFormField } from "@/components/scenario-carousel/scan-types/golden-cross-form/golden-cross-form.types";

// Generic FormFieldsGeneratorProps
interface FormFieldsGeneratorProps<T extends FieldValues> {
  form: UseFormReturn<T>; // Use generic type for form data
  formFields: IFormField<T>[]; // Assuming you have this interface already defined
  isLoading: boolean;
  onSubmit: SubmitHandler<T>; // Generic submit handler for different form types
}

// Define form field properties as generic to handle different form values
interface FormFieldProps<T extends FieldValues> {
  name: Path<T>; // Generic keyof type
  label: string;
  description: string;
  control: Control<T>; // Type for control can be more specific if needed
  type: string;
}

const FormField = <T extends FieldValues>({
  name,
  label,
  description,
  control,
  type,
}: FormFieldProps<T>) => (
  <Controller
    name={name} // Convert name to string since Controller expects a string
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

const FormFieldsGenerator = <T extends FieldValues>({
  form,
  formFields,
  isLoading,
  onSubmit,
}: FormFieldsGeneratorProps<T>) => {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
      {formFields.map(({ name, label, description, type }) => (
        <FormField
          name={name} // Use generic keyof T to define field names
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

export default FormFieldsGenerator;
