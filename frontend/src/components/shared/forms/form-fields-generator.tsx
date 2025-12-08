import React from "react";
import {
  Controller,
  UseFormReturn,
  SubmitHandler,
  FieldValues,
  Control,
  Path,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IFormGeneratorField } from "./form-field-generator.types";

// Generic FormFieldsGeneratorProps
interface FormFieldsGeneratorProps<T extends FieldValues> {
  form: UseFormReturn<T>; // Use generic type for form data
  formFields: IFormGeneratorField<T>[]; // Assuming you have this interface already defined
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
  options?: { label: string; value: string }[];
}

const FormField = <T extends FieldValues>({
  name,
  label,
  description,
  control,
  type,
  options,
}: FormFieldProps<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="grid gap-2 text-left">
          <Label htmlFor={name as string} className="text-sm font-semibold text-zinc-800">
            {label}
          </Label>
          {type === "checkbox" && options ? (
            // Render checkboxes when the type is 'checkbox' and options are available
            <div className="space-y-2">
              {options.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`${name}-${option.value}`}
                    checked={field.value?.includes(option.value)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const newValue = e.target.checked
                        ? [...(field.value || []), option.value]
                        : field.value.filter((v: string) => v !== option.value);
                      field.onChange(newValue);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                  />
                  <label
                    htmlFor={`${name}-${option.value}`}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          ) : (
            // Render Input for other input types
            <Input
              id={name as string}
              className="bg-white"
              {...field}
              type={type}
            />
          )}
          {description && (
            <p className="text-xs text-zinc-700">{description}</p>
          )}
        </div>
      )}
    />
  );
};

const FormFieldsGenerator = <T extends FieldValues>({
  form,
  formFields,
  isLoading,
  onSubmit,
}: FormFieldsGeneratorProps<T>) => {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
      {formFields.map(({ name, label, description, type, options }) => (
        <FormField
          key={name}
          name={name} // Use generic keyof T to define field names
          label={label}
          description={description}
          control={form.control}
          type={type}
          options={options}
        />
      ))}
      <div className="mt-4">
        <Button
          type="submit"
          className="w-full bg-zinc-800 hover:bg-zinc-900 text-white"
          disabled={isLoading}
        >
          {isLoading ? "Scanning..." : "Start Scan"}
        </Button>
      </div>
    </form>
  );
};

export default FormFieldsGenerator;
