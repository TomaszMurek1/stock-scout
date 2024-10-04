import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface FormFieldsProps {
  form: any;
  isLoading: boolean;
  onSubmit: (values: any) => void;
}

const GoldenCrossFormFields = ({
  form,
  isLoading,
  onSubmit,
}: FormFieldsProps) => (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <FormField
        control={form.control}
        name="shortPeriod"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-slate-700">
              Short Period (days)
            </FormLabel>
            <FormControl>
              <Input type="number" className="border-slate-300" {...field} />
            </FormControl>
            <FormDescription className="text-slate-500">
              The number of days for the short-term moving average (e.g., 50
              days).
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="longPeriod"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-slate-700">Long Period (days)</FormLabel>
            <FormControl>
              <Input type="number" className="border-slate-300" {...field} />
            </FormControl>
            <FormDescription className="text-slate-500">
              The number of days for the long-term moving average (e.g., 200
              days).
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="daysToLookBack"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-slate-700">Days to Look Back</FormLabel>
            <FormControl>
              <Input type="number" className="border-slate-300" {...field} />
            </FormControl>
            <FormDescription className="text-slate-500">
              The number of days in the past to analyze for the Golden Cross
              pattern.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button
        type="submit"
        className="w-full bg-slate-700 text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
        disabled={isLoading}
      >
        {isLoading ? "Scanning..." : "Start Scan"}
      </Button>
    </form>
  </Form>
);

export default GoldenCrossFormFields;
