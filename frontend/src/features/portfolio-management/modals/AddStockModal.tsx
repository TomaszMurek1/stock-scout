"use client";

import { FC, useState } from "react";
import { Loader2 } from "lucide-react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { AppState, useAppStore } from "@/store/appStore";

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormValues {
  symbol: string;
  shares: number;
  price: number;
  fee: number;
  currency: string;
  currency_rate: number;
  trade_date: string;
  account_id: number;
}

const AddStockModal: FC<AddStockModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      fee: 0,
      currency: "USD",
      currency_rate: 1,
      trade_date: new Date().toISOString().slice(0, 10),
      account_id: 1,
    },
  });

  const [loading, setLoading] = useState(false);
  const buy = useAppStore((state: AppState) => state.buy);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setLoading(true);
    try {
      await buy({
        ticker: data.symbol.toUpperCase(),
        shares: data.shares,
        price: data.price,
        fee: data.fee,
        currency: data.currency.toUpperCase(),
        currency_rate: data.currency_rate,
        trade_date: data.trade_date,
        account_id: data.account_id,
      } as any);

      toast.success("Position added!");
      reset();
      onClose();
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.detail || err?.message || "Could not add position";
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-slate-50">
        <DialogHeader>
          <DialogTitle>Add Position</DialogTitle>
          <DialogDescription>
            Enter the details of your stock purchase manually.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                placeholder="e.g. AAPL"
                {...register("symbol", { required: true })}
                className={`${errors.symbol ? "border-red-500" : ""} bg-white`}
              />
              {errors.symbol && <span className="text-xs text-red-500">Required</span>}
            </div>
             <div className="grid gap-2">
              <Label htmlFor="trade_date">Date</Label>
              <Input
                id="trade_date"
                type="date"
                {...register("trade_date", { required: true })}
                className={`${errors.trade_date ? "border-red-500" : ""} bg-white`}
              />
               {errors.trade_date && <span className="text-xs text-red-500">Required</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="shares">Shares</Label>
              <Input
                id="shares"
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                {...register("shares", { required: true, valueAsNumber: true, min: 0 })}
                className={`${errors.shares ? "border-red-500" : ""} bg-white`}
              />
              {errors.shares && <span className="text-xs text-red-500">Invalid shares</span>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                {...register("price", { required: true, valueAsNumber: true, min: 0 })}
                className={`${errors.price ? "border-red-500" : ""} bg-white`}
              />
              {errors.price && <span className="text-xs text-red-500">Invalid price</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
               <Input
                id="currency"
                placeholder="USD"
                {...register("currency", { required: true })}
                className={`${errors.currency ? "border-red-500" : ""} bg-white`}
              />
              {errors.currency && <span className="text-xs text-red-500">Required</span>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency_rate">FX Rate</Label>
              <Input
                id="currency_rate"
                type="number"
                step="any"
                {...register("currency_rate", { required: true, valueAsNumber: true })}
                 className={`${errors.currency_rate ? "border-red-500" : ""} bg-white`}
              />
            </div>
          </div>

           <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fee">Fee (Optional)</Label>
              <Input
                id="fee"
                type="number"
                step="any"
                placeholder="0.00"
                className="bg-white"
              />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="account_id">Account</Label>
              <select
                id="account_id"
                {...register("account_id", { required: true, valueAsNumber: true })}
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value={1}>Account 1</option>
                <option value={2}>Account 2</option>
                <option value={3}>Account 3</option>
              </select>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Adding..." : "Add Position"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStockModal;
