export type CurrencyCode = "USD" | "EUR" | "GBP" | "PLN";

export interface PortfolioStock {
    shares_number: number
    ticker: string
    name: string
    purchasePrice: number
    currentPrice: number
    currency: string
}


export interface PortfolioInfo {
    id: number;
    name: string;
    currency: string;
}

export interface HoldingItem {
    ticker: string;
    name: string;
    shares: number;
    average_price: number;
    last_price: number;
    currency: string;
}

export interface WatchlistItem {
    ticker: string;
    name: string;
}

export interface CurrencyRate {
    from: string;
    to: string;
    rate: number;
}

export interface UserPortfolioResponse {
    portfolio: PortfolioInfo;
    holdings: HoldingItem[];
    watchlist: WatchlistItem[];
    currency_rates: CurrencyRate[];
}

export interface AddStockPayload {
    ticker: string;
    shares: number;
    price: number;
    fee?: number;
}

export interface Portfolio {
    id: number
    name: string
    currency: CurrencyCode
}

// export interface Transaction {
//     id: number
//     ticker: string
//     name: string
//     transaction_type: "buy" | "sell"
//     shares: number // always use number for calculations!
//     price: number
//     fee: number
//     timestamp: string
//     currency: string
//     currency_rate: number
// }


export interface WatchlistStock {
    // Fill as appropriate for your project
    ticker: string
    name: string
}

export interface CurrencyRate {
    rate: number // e.g. 3.95
    last_updated: string // ISO date
}

export type Transaction = {
    id: number; // unique identifier for the transaction
    ticker: string;
    name: string;
    transaction_type: "buy" | "sell";
    shares: string | number;
    price: string | number;
    fee?: string | number; // optional, can be 0
    timestamp: string; // ISO date
    currency: string;
    currency_rate: string | number; // rate used when transaction was made
};

export type Holding = {
    ticker: string;
    shares: number;
    avg_cost: number; // in portfolio currency
};

export type LatestPriceMap = Record<string, number>; // latest price in native currency

export type LatestFXMap = Record<string, number>; // e.g. { USD: 3.95, PLN: 1, GBP: 5.1 }

export type HistoricalRate = {
    date: string;
    close: string | number;
};

export type PriceHistoryEntry = {
    date: string;
    close: number;
};

export type CurrencyRates = Record<
    string,
    {
        historicalData: HistoricalRate[];
    }
>;

export type InvestedPerHolding = Record<
    string,
    {
        investedInHolding: number;
        investedInPortfolio: number;
    }
>;

export type IByHolding = Record<string, HoldingValuation>

export type HoldingValuation = {
    currentValueInHolding: number;
    currentValueInPortfolio: number;
    investedValueInHolding: number;
    investedValueInPortfolio: number;
    gainLossInHolding: number;
    gainLossInPortfolio: number;
    isPositive: boolean;
    quantity: number;
    price: number | undefined;
    fx: number;
    holdingCurrency: string;
};

export type TotalValueResult = {
    totalValueBase: number;
    byHolding: IByHolding;
};