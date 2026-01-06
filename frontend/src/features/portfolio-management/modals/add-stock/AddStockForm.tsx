"use client";

import { FC } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { TickerSelector } from "@/components/shared/TickerSelector";
import { useAddStockForm } from "./use-add-stock-form";
import { CostSummary } from "./cost-summary";

interface AddStockFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  isOpen: boolean;
  initialTicker?: string;
  initialName?: string;
  initialCurrency?: string;
  initialPrice?: number;
  initialType?: "buy" | "sell";
  onTypeChange?: (type: "buy" | "sell") => void;
}

const LABEL_CLASS = "text-blue-900 font-bold text-[10px] uppercase tracking-wider";
const INPUT_CLASS = "bg-white text-xs h-9 focus:border-blue-500 focus:ring-blue-500";

export const AddStockForm: FC<AddStockFormProps> = ({ 
  onClose, 
  onSuccess, 
  isOpen, 
  initialTicker,
  initialName,
  initialCurrency,
  initialPrice,
  initialType,
  onTypeChange
}) => {
  const {
    register,
    handleSubmit,
    watch,
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
    selectedAccount,
    hasInsufficientBalance,
    availableBalance,
    selectedCompany,
    isPortfolioLoading,
    transactionType,
    setTransactionType,
    availableShares,
    hasInsufficientShares,
  } = useAddStockForm({ 
    onClose, 
    onSuccess, 
    isOpen, 
    initialTicker,
    initialName,
    initialCurrency,
    initialPrice,
    initialType
  });

  const handleTypeChange = (type: "buy" | "sell") => {
      setTransactionType(type);
      onTypeChange?.(type);
  };

  const isBuy = transactionType === "buy";
  const themeColor = isBuy ? "teal" : "blue";
  const ThemeButton = isBuy ? "bg-teal-600 hover:bg-teal-700 shadow-teal-600/20" : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20";
  
  const getInputClassName = (hasError: boolean) => 
    `${hasError ? "border-red-500" : "border-slate-300"} ${INPUT_CLASS}`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="min-h-[500px] p-6 grid grid-cols-4 gap-x-4 gap-y-7 content-start">
      {/* Type Toggle */}
      <div className="col-span-4 flex justify-center mb-2">
        <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
          <button
            type="button"
            onClick={() => handleTypeChange("buy")}
            className={`px-6 py-1.5 rounded-md text-xs font-bold transition-all ${
              isBuy 
                ? "bg-white text-teal-700 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("sell")}
            className={`px-6 py-1.5 rounded-md text-xs font-bold transition-all ${
              !isBuy 
                ? "bg-white text-blue-700 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Sell
          </button>
        </div>
      </div>

      {/* Row 1: Instrument (3) / Date (1) */}
      <div className="col-span-3 grid gap-2">
        <Label htmlFor="symbol" className={LABEL_CLASS}>Instrument</Label>
        {initialTicker ? (
          <Input
            value={selectedCompany ? `${selectedCompany.ticker} — ${selectedCompany.name}` : "Loading..."}
            disabled
            className="bg-slate-100 font-medium text-slate-700 disabled:opacity-100"
          />
        ) : (
          <TickerSelector
            onSelect={handleTickerSelect}
            placeholder="Search ticker..."
            initialSelection={selectedCompany}
          />
        )}
        <input
          type="hidden"
          {...register("symbol", { required: true })}
        />
        {errors.symbol && <span className="text-xs text-red-500 font-medium">Required</span>}
      </div>
      <div className="col-span-1 grid gap-2">
        <Label htmlFor="trade_date" className={LABEL_CLASS}>Date</Label>
        <Input
          id="trade_date"
          type="date"
          {...register("trade_date", { required: true })}
          className={getInputClassName(!!errors.trade_date)}
        />
         {errors.trade_date && <span className="text-xs text-red-500 font-medium">Required</span>}
      </div>

      {/* Row 2: Shares (1) / Price (1) / Currency (1) / FX (1) */}
      <div className="col-span-1 grid gap-2">
        <div className="flex justify-between items-baseline">
           <Label htmlFor="shares" className={LABEL_CLASS}>Shares</Label>
           {!isBuy && selectedTicker && (
             <span className="text-[10px] text-slate-500">Max: {availableShares}</span>
           )}
        </div>
        <Input
          id="shares"
          type="number"
          step="any"
          min="0"
          placeholder="0.00"
          {...register("shares", { required: true, valueAsNumber: true, min: 0 })}
          className={getInputClassName(!!errors.shares)}
        />
      </div>
      <div className="col-span-1 grid gap-2">
        <Label htmlFor="price" className={LABEL_CLASS}>Price</Label>
        <Input
          id="price"
          type="number"
          step="any"
          min="0"
          placeholder="0.00"
          {...register("price", { required: true, valueAsNumber: true, min: 0 })}
          className={getInputClassName(!!errors.price)}
        />
      </div>
      <div className="col-span-1 grid gap-2">
        <Label htmlFor="currency" className={`${LABEL_CLASS} text-center`}>CCY</Label>
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
             <Label htmlFor="currency_rate" className={LABEL_CLASS}>
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
        <Label htmlFor="account_id" className={LABEL_CLASS}>Account</Label>
        <select
          id="account_id"
          {...register("account_id", { required: true, valueAsNumber: true })}
          disabled={isPortfolioLoading || loading}
          className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-semibold text-slate-700"
        >
          {isPortfolioLoading && safeAccounts.length === 0 ? (
             <option>Loading accounts...</option>
          ) : (
            safeAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.currency}) - Cash: {acc.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </option>
            ))
          )}
        </select>
      </div>
      <div className="col-span-1 grid gap-2">
        <Label htmlFor="fee" className={LABEL_CLASS}>Fee ({accountCurrency})</Label>
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
        fee={watch("fee") || 0}
        hasInsufficientBalance={hasInsufficientBalance}
        availableBalance={availableBalance}
      />
      
      {/* Insufficient Shares Warning (Sell) */}
      {hasInsufficientShares && (
        <div className="col-span-4 -mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <span className="text-xs font-semibold text-red-800">
                Insufficient Shares: You only have {availableShares} {selectedTicker} in this account.
            </span>
        </div>
      )}

      <DialogFooter className="col-span-4 mt-auto flex justify-end gap-3">
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
          disabled={loading || !selectedTicker || hasInsufficientBalance || hasInsufficientShares}
          className={`${ThemeButton} text-white font-bold px-8 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading 
            ? (isBuy ? "Adding..." : "Selling...") 
            : (isBuy ? "Add Position" : "Sell Position")
          }
        </Button>
      </DialogFooter>
    </form>
  );
};
