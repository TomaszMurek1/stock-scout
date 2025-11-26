import { FC } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { buyStock, sellStock } from "@/services/api/portfolio";
import { formatCurrency } from "@/utils/formatting";

const formSchema = z.object({
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
});

interface TradePanelProps {
  action: "buy" | "sell";
  companyId: number;
  currentPrice: number;
  onTrade: () => void;
}

const TradePanel: FC<TradePanelProps> = ({
  action,
  companyId,
  currentPrice,
  onTrade,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (action === "buy") {
        await buyStock(companyId, values.quantity, currentPrice);
      } else {
        await sellStock(companyId, values.quantity, currentPrice);
      }
      alert(`${action.charAt(0).toUpperCase() + action.slice(1)} successful`);
      onTrade(); // Close modal on success
    } catch (err) {
      console.error(err);
      alert(`${action} failed`);
    }
  };

  const quantity = form.watch("quantity") || 0;
  const totalValue = quantity * currentPrice;
  const isBuy = action === "buy";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input type="number" placeholder="1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price per Share:</span>
            <span>{formatCurrency({ value: currentPrice })}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span className="text-muted-foreground">Total Value:</span>
            <span>{formatCurrency({ value: totalValue })}</span>
          </div>
        </div>

        <Button
          type="submit"
          className={`w-full ${
            isBuy
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700"
          } text-white`}
        >
          {isBuy ? "Confirm Buy" : "Confirm Sell"}
        </Button>
      </form>
    </Form>
  );
};

export default TradePanel;
