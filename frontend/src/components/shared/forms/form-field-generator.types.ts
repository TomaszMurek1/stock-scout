import {
  FieldValues,
  Path,
  SubmitHandler,
  UseFormReturn,
} from "react-hook-form";

export interface IFormGeneratorField<T extends FieldValues> {
  name: Path<T>;
  label: string;
  description: string;
  type: string;
  options?: { label: string; value: string }[];
}

export interface FormFieldsGeneratorProps<T extends FieldValues> {
  form: UseFormReturn<T>; // Generic type for form values
  formFields: IFormGeneratorField<T>[]; // This remains the same
  isLoading: boolean;
  onSubmit: SubmitHandler<T>; // Generic type for submit handler
}
