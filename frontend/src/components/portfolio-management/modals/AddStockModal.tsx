"use client";

import { FC, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { AppState, useAppStore } from "@/store/appStore";

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // optional callback (e.g. refresh portfolio)
}

interface FormValues {
  symbol: string;
  shares: number;
  price: number;
  fee: number;
  currency: string;
  currency_rate: number;
  trade_date: string; // YYYY-MM-DD
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
      currency: "",
      currency_rate: 1,
      trade_date: new Date().toISOString().slice(0, 10), // today
      account_id: 1,
    },
  });

  const [loading, setLoading] = useState(false);
  const buy = useAppStore((state: AppState) => state.buy);

  if (!isOpen) return null;

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
        trade_date: data.trade_date, // <<< required by backend
        account_id: data.account_id, // <<< passed to backend (ignored for now if model doesn’t have it)
      } as any); // cast if your buy() type doesn’t yet include trade_date/account_id

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Buy stock / add position</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            type="button"
            className="text-gray-500"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-4">
          {/* symbol */}
          <div>
            <label htmlFor="symbol" className="mb-1 block text-sm font-medium">
              Stock symbol
            </label>
            <input
              id="symbol"
              type="text"
              placeholder="e.g. AAPL or 11B.WA"
              {...register("symbol", { required: true })}
              className="w-full rounded border p-2"
            />
            {errors.symbol && <p className="mt-1 text-sm text-red-500">Symbol is required</p>}
          </div>

          {/* trade date & account */}
          <div className="grid grid-cols-2 gap-4">
            {/* Trade date */}
            <div>
              <label htmlFor="trade_date" className="mb-1 block text-sm font-medium">
                Trade date
              </label>
              <input
                id="trade_date"
                type="date"
                {...register("trade_date", { required: true })}
                className="w-full rounded border p-2"
              />
              {errors.trade_date && (
                <p className="mt-1 text-sm text-red-500">Trade date is required</p>
              )}
            </div>

            {/* Account */}
            <div>
              <label htmlFor="account_id" className="mb-1 block text-sm font-medium">
                Account
              </label>
              <select
                id="account_id"
                {...register("account_id", {
                  required: true,
                  valueAsNumber: true,
                })}
                className="w-full rounded border p-2 bg-white"
              >
                <option value={1}>Account 1</option>
                <option value={2}>Account 2</option>
                <option value={3}>Account 3</option>
              </select>
              {errors.account_id && (
                <p className="mt-1 text-sm text-red-500">Account is required</p>
              )}
            </div>
          </div>

          {/* shares & price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="shares" className="mb-1 block text-sm font-medium">
                Shares
              </label>
              <input
                id="shares"
                type="number"
                step="0.0001"
                min="0.0001"
                {...register("shares", {
                  required: true,
                  valueAsNumber: true,
                  min: 0.0001,
                })}
                className="w-full rounded border p-2"
              />
              {errors.shares && <p className="mt-1 text-sm text-red-500">Invalid shares</p>}
            </div>

            <div>
              <label htmlFor="price" className="mb-1 block text-sm font-medium">
                Price / share
              </label>
              <input
                id="price"
                type="number"
                step="0.0001"
                min="0.0001"
                {...register("price", {
                  required: true,
                  valueAsNumber: true,
                  min: 0.0001,
                })}
                className="w-full rounded border p-2"
              />
              {errors.price && <p className="mt-1 text-sm text-red-500">Invalid price</p>}
            </div>
          </div>

          {/* optional fee */}
          <div>
            <label htmlFor="fee" className="mb-1 block text-sm font-medium">
              Broker fee (optional)
            </label>
            <input
              id="fee"
              type="number"
              step="0.01"
              min="0"
              {...register("fee", { valueAsNumber: true, min: 0 })}
              className="w-full rounded border p-2"
            />
            {errors.fee && <p className="mt-1 text-sm text-red-500">Invalid fee</p>}
          </div>

          {/* currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="currency" className="mb-1 block text-sm font-medium">
                Currency
              </label>
              <input
                id="currency"
                type="text"
                placeholder="e.g. USD, PLN"
                {...register("currency", { required: true })}
                className="w-full rounded border p-2"
              />
              {errors.currency && <p className="mt-1 text-sm text-red-500">Currency is required</p>}
            </div>

            <div>
              <label htmlFor="currency_rate" className="mb-1 block text-sm font-medium">
                FX rate
              </label>
              <input
                id="currency_rate"
                type="number"
                step="0.0001"
                min="0"
                {...register("currency_rate", {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                })}
                className="w-full rounded border p-2"
              />
              {errors.currency_rate && <p className="mt-1 text-sm text-red-500">Invalid FX rate</p>}
            </div>
          </div>

          {/* footer buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add position"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStockModal;
