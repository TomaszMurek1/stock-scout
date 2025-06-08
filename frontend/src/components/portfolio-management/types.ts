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