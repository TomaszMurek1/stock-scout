import { apiClient } from "@/services/apiClient";
import { create } from "zustand";


interface Holding {
    company_id: number;
    ticker: string;
    shares: number;
    average_cost: number;
    market_price: number | null;
    market_value: number | null;
    unrealized: number | null;
}

interface PortfolioSlice {
    holdings: Holding[];
    refresh(): Promise<void>;
    buy(data: {
        ticker: string;
        shares: number;
        price: number;
        fee?: number;
    }): Promise<void>;
    sell(data: {
        ticker: string;
        shares: number;
        price: number;
        fee?: number;
    }): Promise<void>;
}

export const usePortfolioStore = create<PortfolioSlice>((set, get) => ({
    holdings: [],

    async refresh() {
        const { data } = await apiClient.get("/portfolio-management");
        set({ holdings: data.holdings });
    },

    async buy({ ticker, shares, price, fee = 0 }) {
        debugger
        await apiClient.post("/portfolio-management/buy", {
            ticker,
            shares,
            price,
            fee,
        });
        await get().refresh();
    },

    async sell({ ticker, shares, price, fee = 0 }) {
        await apiClient.post("/portfolio-management/sell", {
            ticker,
            shares,
            price,
            fee,
        });
        await get().refresh();
    },
}));
