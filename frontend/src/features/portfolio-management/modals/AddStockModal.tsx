"use client";

import { FC, useState, useEffect } from "react";
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
import { TickerSelector } from "@/components/shared/TickerSelector";
import { Company } from "@/features/company-search/types";
import { apiClient } from "@/services/apiClient";

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
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      fee: 0,
      currency: "",
      currency_rate: 1,
      trade_date: new Date().toISOString().slice(0, 10),
      account_id: 1,
    },
  });

  const [loading, setLoading] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string>("");
  const buy = useAppStore((state: AppState) => state.buy);
  const portfolio = useAppStore((state: AppState) => state.portfolio);
  const fxRates = useAppStore((state: AppState) => state.fxRates);
  const setFxRates = useAppStore((state: AppState) => state.setFxRates);

  // Watch form values for sum calculation
  const shares = watch("shares") || 0;
  const price = watch("price") || 0;
  const fee = watch("fee") || 0;
  const currencyRate = watch("currency_rate") || 1;
  const currency = watch("currency");

  // Calculate sum in portfolio currency
  const sum = shares * price * currencyRate + fee;

  // Get FX rate from store or fetch if missing
  useEffect(() => {
    const getFxRate = async () => {
      // Only set FX rate if a ticker has been selected
      if (!currency || !portfolio?.currency || !selectedTicker) {
        console.log("Skipping FX rate fetch - no ticker selected yet");
        return;
      }
      
      console.log("Getting FX rate for currency:", currency, "to", portfolio.currency);
      
      if (currency === portfolio.currency) {
        setValue("currency_rate", 1);
        console.log("Same currency, FX rate set to 1");
        return;
      }

      // Check if fx rate exists in store
      const pairKey = `${currency}-${portfolio.currency}`;
      const rates = fxRates[pairKey];
      
      if (rates && rates.length > 0) {
        // Get the most recent rate from store
        const latestRate = rates[rates.length - 1];
        const rate = latestRate.close;
        setValue("currency_rate", rate);
        console.log(`FX rate from store for ${pairKey}:`, rate);
        return;
      }

      // If not in store, fetch from API
      console.log(`No FX rate found in store for ${pairKey}, fetching from API...`);
      try {
        const response = await apiClient.post<Record<string, { 
          base: string; 
          quote: string; 
          historicalData: { date: string; open: number; high: number; low: number; close: number }[] 
        }>>("/fx-rate/batch", {
          pairs: [{ base: currency, quote: portfolio.currency }],
        });

        const data = response.data[pairKey];
        
        if (data?.historicalData && data.historicalData.length > 0) {
          const latest = data.historicalData[data.historicalData.length - 1];
          setValue("currency_rate", latest.close);
          console.log(`FX rate from API for ${pairKey}:`, latest.close);
          
          // Store the fetched FX rates for future use
          const fxRatesForStore: Record<string, any[]> = {
            [pairKey]: data.historicalData.map((item: any) => ({
              base: data.base,
              quote: data.quote,
              date: item.date,
              open: item.open,
              high: item.high,
              low: item.low,
              close: item.close,
            }))
          };
          setFxRates(fxRatesForStore);
          console.log(`Stored FX rate in store for ${pairKey}`);
        } else {
          console.log(`No FX rate data returned from API for ${pairKey}, using 1.0 as fallback`);
          setValue("currency_rate", 1);
        }
      } catch (error) {
        console.error("Error fetching FX rate:", error);
        toast.warning("Could not fetch FX rate, defaulting to 1.0");
        setValue("currency_rate", 1);
      }
    };

    getFxRate();
  }, [currency, portfolio?.currency, selectedTicker, fxRates, setValue]);

  const handleTickerSelect = async (company: Company) => {
    console.log("[handleTickerSelect] Selected ticker:", company.ticker);
    setSelectedTicker(company.ticker);
    setValue("symbol", company.ticker);
    
    // Set currency if available
    if (company.currency) {
      setValue("currency", company.currency);
      console.log("[handleTickerSelect] Set currency:", company.currency);
    }

    // Fetch latest price from candles endpoint (lighter than stock-details)
    console.log(`[handleTickerSelect] Fetching price for ${company.ticker}...`);
    try {
      const response = await apiClient.get(`/stocks-ohlc/${company.ticker}/candles`, {
        params: { limit: 1 }
      });
      
      console.log(`[handleTickerSelect] Candles response:`, response.data);
      
      // Get the latest candle (last entry in array)
      if (Array.isArray(response.data) && response.data.length > 0) {
        const latestCandle = response.data[response.data.length - 1];
        const latestPrice = latestCandle.close;
        setValue("price", latestPrice);
        console.log(`Auto-populated price for ${company.ticker}:`, latestPrice);
      } else {
        console.log(`[handleTickerSelect] No price data available for ${company.ticker}`);
      }
    } catch (error) {
      console.error(`Could not fetch price for ${company.ticker}:`, error);
      // Not a critical error, user can enter price manually
    }
  };

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
      setSelectedTicker("");
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
          <DialogTitle className="text-slate-900">Add Position</DialogTitle>
          <DialogDescription className="text-slate-600">
            Enter the details of your stock purchase manually.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="symbol" className="text-slate-700 font-medium">Symbol</Label>
              <TickerSelector
                onSelect={handleTickerSelect}
                placeholder="Search ticker..."
              />
              <input
                type="hidden"
                {...register("symbol", { required: true })}
              />
              {errors.symbol && <span className="text-xs text-red-500">Required</span>}
            </div>
             <div className="grid gap-2">
              <Label htmlFor="trade_date" className="text-slate-700 font-medium">Date</Label>
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
              <Label htmlFor="shares" className="text-slate-700 font-medium">Shares</Label>
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
              <Label htmlFor="price" className="text-slate-700 font-medium">Price</Label>
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
              <Label htmlFor="currency" className="text-slate-700 font-medium">Currency</Label>
               <Input
                id="currency"
                placeholder="USD"
                {...register("currency", { required: true })}
                className={`${errors.currency ? "border-red-500" : ""} bg-slate-100`}
                disabled
              />
              {errors.currency && <span className="text-xs text-red-500">Required</span>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency_rate" className="text-slate-700 font-medium">
                FX Rate
              </Label>
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
              <Label htmlFor="fee" className="text-slate-700 font-medium">Fee (Optional)</Label>
              <Input
                id="fee"
                type="number"
                step="any"
                placeholder="0.00"
                {...register("fee", { valueAsNumber: true })}
                className="bg-white"
              />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="account_id" className="text-slate-700 font-medium">Account</Label>
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

          {/* Sum Field */}
          <div className="grid gap-2 border-t pt-4">
            <Label htmlFor="sum" className="text-slate-700 font-medium">
              Total Cost (in {portfolio?.currency || "USD"})
            </Label>
            <Input
              id="sum"
              type="text"
              value={sum.toFixed(2)}
              disabled
              className="bg-slate-100 font-semibold text-slate-900"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || loading}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || loading || !selectedTicker}
              className="bg-slate-800 hover:bg-slate-700 text-white"
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
