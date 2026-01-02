import { FC } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FieldError, UseFormRegister } from "react-hook-form";
import { FormValues } from "./use-add-stock-form";

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  register: UseFormRegister<FormValues>;
  error?: FieldError;
  disabled?: boolean;
  className?: string;
  step?: string;
  min?: string;
  tabIndex?: number;
  labelClassName?: string;
}

export const FormField: FC<FormFieldProps> = ({
  id,
  label,
  type = "text",
  placeholder,
  register,
  error,
  disabled = false,
  className = "",
  step,
  min,
  tabIndex,
  labelClassName = "text-blue-900 font-bold text-[10px] uppercase tracking-wider",
}) => {
  const baseInputClass = "bg-white text-xs h-9 focus:border-blue-500 focus:ring-blue-500";
  const errorClass = error ? "border-red-500" : "border-slate-300";
  const finalClassName = `${errorClass} ${baseInputClass} ${className}`;

  const registerOptions: any = {};
  
  if (type === "number") {
    registerOptions.valueAsNumber = true;
    if (min) registerOptions.min = parseFloat(min);
  }
  
  if (id === "symbol" || id === "trade_date" || id === "currency" || id === "currency_rate" || id === "account_currency_rate") {
    registerOptions.required = true;
  }

  return (
    <>
      <Label htmlFor={id} className={labelClassName}>
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        step={step}
        min={min}
        disabled={disabled}
        tabIndex={tabIndex}
        {...register(id as any, registerOptions)}
        className={finalClassName}
      />
      {error && <span className="text-xs text-red-500 font-medium">Required</span>}
    </>
  );
};
