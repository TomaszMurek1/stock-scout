import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "react-toastify";
import { AppState, useAppStore } from "@/store/appStore";
import { Company } from "@/features/company-search/types";
import { apiClient } from "@/services/apiClient";

export interface FormValues {
  symbol: string;
  shares: number;
  price: number;
  fee: number;
  currency: string;
  currency_rate: number;
  trade_date: string;
  account_id: number;
  account_currency_rate: number;
}

interface UseAddStockFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  isOpen: boolean;
  initialTicker?: string;
  initialName?: string;
  initialCurrency?: string;
  initialPrice?: number;
}

export const useAddStockForm = ({ 
  onClose, 
  onSuccess, 
  isOpen, 
  initialTicker,
  initialName,
  initialCurrency,
  initialPrice 
}: UseAddStockFormProps) => {
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
      account_currency_rate: 1,
      trade_date: new Date().toISOString().slice(0, 10),
      account_id: 1,
    },
  });

  const [loading, setLoading] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const buy = useAppStore((state: AppState) => state.buy);
  const portfolio = useAppStore((state: AppState) => state.portfolio);
  const accounts = useAppStore((state: AppState) => state.accounts);
  const refreshPortfolio = useAppStore((state: AppState) => state.refreshPortfolio);
  const isPortfolioLoading = useAppStore((state: AppState) => state.isLoading);
  const fxRates = useAppStore((state: AppState) => state.fxRates);
  const setFxRates = useAppStore((state: AppState) => state.setFxRates);

  // Watch form values for sum calculation
  const shares = watch("shares") || 0;
  const price = watch("price") || 0;
  const fee = watch("fee") || 0;
  const accountCurrencyRate = watch("account_currency_rate") || 1;
  const currency = watch("currency");
  const accountId = watch("account_id");
  const safeAccounts = accounts || [];
  const selectedAccount = safeAccounts.find((a) => a.id === accountId);
  
  // Dynamic Account Currency
  const accountCurrency = selectedAccount?.currency || portfolio?.currency || "USD"; 
  
  // Ensure portfolio data is loaded
  useEffect(() => {
    if ((!portfolio?.id || accounts.length === 0) && !isPortfolioLoading) {
      refreshPortfolio();
    }
  }, [portfolio?.id, accounts.length, isPortfolioLoading, refreshPortfolio]);

  // Set default account on load
  useEffect(() => {
    if (safeAccounts.length > 0) {
       setValue("account_id", safeAccounts[0].id);
    }
  }, [safeAccounts, setValue]); 

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setSelectedTicker("");
      setSelectedCompany(null);
    }
  }, [isOpen, reset]); 

  // Pre-select ticker if provided
  useEffect(() => {
    if (isOpen && initialTicker && !selectedTicker) {
      // Construct company object from passed props
      const company: Company = {
        ticker: initialTicker,
        name: initialName || initialTicker,
        currency: initialCurrency || null,
      };

      setSelectedCompany(company);
      setSelectedTicker(initialTicker);
      setValue("symbol", initialTicker);
      
      if (initialCurrency) {
        setValue("currency", initialCurrency);
      }
      
      if (initialPrice) {
        setValue("price", initialPrice);
      }
    }
  }, [isOpen, initialTicker, selectedTicker, initialName, initialCurrency, initialPrice, setValue]);

  // Calculate total in Trade Currency (Stock Currency)
  const sumStock = shares * price;
  
  // Calculate actual cost in account currency (what user pays)
  const sumAccount = (sumStock * accountCurrencyRate) + fee;

  // Balance validation
  const availableBalance = selectedAccount?.cash || 0;
  const hasInsufficientBalance = sumAccount > availableBalance && sumAccount > 0;

  // Get FX rate from store or fetch if missing
  useEffect(() => {
    const getFxRates = async () => {
      if (!currency || !portfolio?.currency || !selectedTicker) {
        return;
      }
      
      await fetchRate(currency, portfolio.currency, "currency_rate");

      if (currency === accountCurrency) {
        setValue("account_currency_rate", 1);
      } else if (portfolio.currency === accountCurrency) {
        const rate = watch("currency_rate");
        setValue("account_currency_rate", rate);
      } else {
        await fetchRate(currency, accountCurrency, "account_currency_rate");
      }
    };

    const fetchRate = async (base: string, quote: string, fieldName: "currency_rate" | "account_currency_rate") => {
      if (base === quote) {
        setValue(fieldName, 1);
        return;
      }

      const pairKey = `${base}-${quote}`;
      const rates = fxRates[pairKey];
      
      if (rates && rates.length > 0) {
        const latestRate = rates[rates.length - 1].close;
        setValue(fieldName, latestRate);
        return;
      }

      try {
        const response = await apiClient.post<Record<string, { 
          base: string; 
          quote: string; 
          historicalData: { date: string; open: number; high: number; low: number; close: number }[] 
        }>>("/fx-rate/batch", {
          pairs: [{ base, quote }],
        });

        const data = response.data[pairKey];
        
        if (data?.historicalData && data.historicalData.length > 0) {
          const latest = data.historicalData[data.historicalData.length - 1];
          setValue(fieldName, latest.close);
          
          const fxRatesForStore = {
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
        } else {
          setValue(fieldName, 1);
        }
      } catch (error) {
        console.error(`Error fetching FX rate for ${pairKey}:`, error);
        setValue(fieldName, 1);
      }
    };

    getFxRates();
  }, [currency, portfolio?.currency, selectedTicker, fxRates, setValue, accountCurrency, watch, setFxRates]);

  const handleTickerSelect = async (company: Company) => {
    setSelectedTicker(company.ticker);
    setSelectedCompany(company);
    setValue("symbol", company.ticker);
    
    if (company.currency) {
      setValue("currency", company.currency);
    }

    try {
      const response = await apiClient.get(`/stocks-ohlc/${company.ticker}/candles`, {
        params: { limit: 1 }
      });
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        const latestCandle = response.data[response.data.length - 1];
        setValue("price", latestCandle.close);
      }
    } catch (error) {
      console.error(`Could not fetch price for ${company.ticker}:`, error);
    }
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setLoading(true);
    try {
      await buy({
        ticker: data.symbol.toUpperCase(),
        shares: data.shares,
        price: data.price,
        fee: data.fee / data.account_currency_rate,
        currency: data.currency.toUpperCase(),
        currency_rate: data.currency_rate,
        account_currency_rate: data.account_currency_rate,
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

  return {
    register,
    handleSubmit,
    watch,
    errors,
    loading: loading || isSubmitting,
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
  };
};
