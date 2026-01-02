"use client";

import { FC } from "react";
import { Loader2, X } from "lucide-react";
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
import { TickerSelector } from "@/components/shared/TickerSelector";
import { useAddStockForm } from "./use-add-stock-form";
import { CostSummary } from "./cost-summary";

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AddStockModal: FC<AddStockModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const {
    register,
    handleSubmit,
    errors,
    loading,
    selectedTicker,
    portfolio,
    safeAccounts,
    accountCurrency,
    sumStock,
    sumAccount,
    currency,
    handleTickerSelect,
    onSubmit,
  } = useAddStockForm({ onClose, onSuccess });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px] bg-slate-50 p-0 overflow-hidden border-none shadow-2xl rounded-xl">
        <DialogHeader className="from-blue-800 to-blue-900 bg-gradient-to-br border-b-4 border-blue-400 px-6 py-4 relative">
          <DialogTitle className="text-white text-xl font-bold flex items-center gap-2">
            Add Position
          </DialogTitle>
          <DialogDescription className="text-blue-100/70 text-xs text-left font-medium">
            Enter the details of your stock purchase manually.
          </DialogDescription>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4 text-white" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 grid grid-cols-4 gap-x-4 gap-y-7">
          {/* Row 1: Instrument (3) / Date (1) */}
          <div className="col-span-3 grid gap-2">
            <Label htmlFor="symbol" className="text-blue-900 font-bold text-[10px] uppercase tracking-wider">Instrument</Label>
            <TickerSelector
              onSelect={handleTickerSelect}
              placeholder="Search ticker..."
            />
            <input
              type="hidden"
              {...register("symbol", { required: true })}
            />
            {errors.symbol && <span className="text-xs text-red-500 font-medium">Required</span>}
          </div>
          <div className="col-span-1 grid gap-2">
            <Label htmlFor="trade_date" className="text-blue-900 font-bold text-[10px] uppercase tracking-wider">Date</Label>
            <Input
              id="trade_date"
              type="date"
              {...register("trade_date", { required: true })}
              className={`${errors.trade_date ? "border-red-500" : "border-slate-300"} bg-white text-xs h-9 focus:border-blue-500 focus:ring-blue-500`}
            />
             {errors.trade_date && <span className="text-xs text-red-500 font-medium">Required</span>}
          </div>

          {/* Row 2: Shares (1) / Price (1) / Currency (1) / FX (1) */}
          <div className="col-span-1 grid gap-2">
            <Label htmlFor="shares" className="text-blue-900 font-bold text-[10px] uppercase tracking-wider">Shares</Label>
            <Input
              id="shares"
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              {...register("shares", { required: true, valueAsNumber: true, min: 0 })}
              className={`${errors.shares ? "border-red-500" : "border-slate-300"} bg-white text-xs h-9 focus:border-blue-500 focus:ring-blue-500`}
            />
          </div>
          <div className="col-span-1 grid gap-2">
            <Label htmlFor="price" className="text-blue-900 font-bold text-[10px] uppercase tracking-wider">Price</Label>
            <Input
              id="price"
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              {...register("price", { required: true, valueAsNumber: true, min: 0 })}
              className={`${errors.price ? "border-red-500" : "border-slate-300"} bg-white text-xs h-9 focus:border-blue-500 focus:ring-blue-500`}
            />
          </div>
          <div className="col-span-1 grid gap-2">
            <Label htmlFor="currency" className="text-blue-900 font-bold text-[10px] uppercase tracking-wider text-center">CCY</Label>
             <Input
              id="currency"
              placeholder="USD"
              {...register("currency", { required: true })}
              className="bg-slate-100 border-none pointer-events-none text-xs h-9 font-bold text-slate-500 text-center"
              tabIndex={-1}
            />
          </div>
          <div className="col-span-1 grid gap-2">
             {/* Show Port. FX if CCY differs from Port. CCY */}
             {(!selectedTicker || currency !== portfolio?.currency) && (
               <>
                 <Label htmlFor="currency_rate" className="text-blue-900 font-bold text-[10px] uppercase tracking-wider">
                   {portfolio?.currency === accountCurrency ? "FX Rate" : "Port. FX"}
                 </Label>
                 <Input
                    id="currency_rate"
                    type="number"
                    step="any"
                    disabled={!selectedTicker}
                    {...register("currency_rate", { required: true, valueAsNumber: true })}
                    className={`${errors.currency_rate ? "border-red-500" : "border-slate-300"} bg-white text-xs h-9 ${!selectedTicker ? "opacity-30" : "focus:border-blue-500 focus:ring-blue-500"}`}
                  />
               </>
             )}
          </div>

          {/* Conditional Row: Account FX - Only show if ticker selected AND account CCY differs from instrument AND portfolio CCY */}
          {selectedTicker && currency !== accountCurrency && portfolio?.currency !== accountCurrency && (
            <div className="col-span-4 grid grid-cols-4 gap-4 -mt-3">
               <div className="col-span-3"></div>
               <div className="col-span-1 grid gap-1">
                <Label htmlFor="account_currency_rate" className="text-amber-700 font-bold text-[10px] uppercase tracking-wider">
                  Acc. FX ({currency || "?"}→{accountCurrency})
                </Label>
                <Input
                  id="account_currency_rate"
                  type="number"
                  step="any"
                  {...register("account_currency_rate", { required: true, valueAsNumber: true })}
                  className={`${errors.account_currency_rate ? "border-red-500" : "border-amber-200"} bg-amber-50 text-xs h-8 font-medium focus:ring-amber-500 focus:border-amber-500`}
                />
              </div>
            </div>
          )}

          {/* Row 3: Account (3) / Fee (1) */}
          <div className="col-span-3 grid gap-2">
            <Label htmlFor="account_id" className="text-blue-900 font-bold text-[10px] uppercase tracking-wider">Account</Label>
            <select
              id="account_id"
              {...register("account_id", { required: true, valueAsNumber: true })}
              className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-semibold text-slate-700"
            >
              {safeAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency}) - Cash: {acc.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-1 grid gap-2">
            <Label htmlFor="fee" className="text-blue-900 font-bold text-[10px] uppercase tracking-wider">Fee ({accountCurrency})</Label>
            <Input
              id="fee"
              type="number"
              step="any"
              placeholder="0.00"
              {...register("fee", { valueAsNumber: true })}
              className="bg-white border-slate-300 text-xs h-9 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Cost Summary Section */}
          <CostSummary
            sumStock={sumStock}
            sumAccount={sumAccount}
            currency={currency}
            accountCurrency={accountCurrency}
          />

          <DialogFooter className="col-span-4 mt-2 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="text-slate-500 hover:text-slate-800 hover:bg-slate-200 font-semibold"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !selectedTicker}
              className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-8 shadow-lg shadow-blue-600/20"
            >
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
