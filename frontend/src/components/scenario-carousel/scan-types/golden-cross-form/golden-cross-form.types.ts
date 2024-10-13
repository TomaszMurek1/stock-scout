import {
  FieldValues,
  Path,
  SubmitHandler,
  UseFormReturn,
} from "react-hook-form";

interface ISingleItem {
  ticker: string;
  name: string;
  date: string;
  days_since_cross: number;
  close: number;
  short_ma: number;
  long_ma: number;
  volume: number;
}

export interface IData {
  ticker: string;
  data: ISingleItem;
}

export interface ScanResultsProps {
  status: string;
  data: IData[];
}

export interface IFormField<T extends FieldValues> {
  name: Path<T>;
  label: string;
  description: string;
  type: string;
}

export interface FormFieldsGeneratorProps<T extends FieldValues> {
  form: UseFormReturn<T>; // Generic type for form values
  formFields: IFormField<T>[]; // This remains the same
  isLoading: boolean;
  onSubmit: SubmitHandler<T>; // Generic type for submit handler
}
