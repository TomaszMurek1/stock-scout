
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface StoreState {
    favorites: string[]
    toggleFavorite: (ticker: string) => void
}

export const useStore = create<StoreState>()(
    devtools(
        persist(
            (set) => ({
                favorites: [],
                toggleFavorite: (ticker) =>
                    set((state) => ({
                        favorites: state.favorites.includes(ticker)
                            ? state.favorites.filter((t) => t !== ticker)
                            : [...state.favorites, ticker],
                    })),
            }),
            {
                name: 'favorites-storage',
            }
        ),
        { name: 'ZustandStore' }
    )
)
