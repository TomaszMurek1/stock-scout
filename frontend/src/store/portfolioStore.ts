// src/stores/portfolioStore.ts
import { PortfolioStock } from '@/components/portfolio-management/types'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'


interface PortfolioState {
    holdings: PortfolioStock[]
    // actions
    addHolding: (stock: Omit<PortfolioStock, 'id'>) => void
    removeHolding: (id: string) => void
}

export const usePortfolioStore = create<PortfolioState>()(
    devtools(
        persist(
            (set) => ({
                // initial state
                holdings: [
                    { id: '1', symbol: 'AAPL', name: 'Apple Inc.', shares: 10, purchasePrice: 150.75, currentPrice: 175.25 },
                    { id: '2', symbol: 'MSFT', name: 'Microsoft Corporation', shares: 5, purchasePrice: 245.3, currentPrice: 280.15 },
                    { id: '3', symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 2, purchasePrice: 2750.0, currentPrice: 2850.5 },
                    { id: '4', symbol: 'GOOGL2', name: 'Alphabet2 Inc.', shares: 2, purchasePrice: 222.0, currentPrice: 2222.5 },
                ],

                // implementations
                addHolding: (stock) =>
                    set((state) => ({
                        holdings: [
                            ...state.holdings,
                            { ...stock, id: Date.now().toString() },
                        ],
                    })),
                removeHolding: (id) =>
                    set((state) => ({
                        holdings: state.holdings.filter((s) => s.id !== id),
                    })),
            }),
            {
                name: 'portfolio-storage', // localStorage key
            }
        ),
        { name: 'PortfolioStore' }
    )
)
