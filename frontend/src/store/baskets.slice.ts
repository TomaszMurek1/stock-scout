import { StateCreator } from "zustand";
import { apiClient } from "@/services/apiClient";
import { toast } from "react-toastify";

export interface Basket {
  id: number;
  name: string;
  type: string;
}

export interface BasketsSlice {
  baskets: {
    data: Basket[];
    isLoading: boolean;
    isLoaded: boolean;
    error: string | null;
  };
  fetchBaskets: () => Promise<void>;
}

export const createBasketsSlice: StateCreator<BasketsSlice> = (set, get, api) => ({
  baskets: {
    data: [],
    isLoading: false,
    isLoaded: false,
    error: null,
  },

  fetchBaskets: async () => {
    const state = get();
    
    // If already loaded or currently loading, skip
    if (state.baskets.isLoaded || state.baskets.isLoading) {
      return;
    }

    set((state) => ({
      baskets: {
        ...state.baskets,
        isLoading: true,
        error: null,
      },
    }));

    try {
      const response = await apiClient.get("/baskets");
      set((state) => ({
        baskets: {
          data: response.data || [],
          isLoading: false,
          isLoaded: true,
          error: null,
        },
      }));
    } catch (error) {
      console.error("Failed to load baskets", error);
      const errorMessage = "Unable to load baskets. Please try again later.";
      toast.error(errorMessage);
      
      set((state) => ({
        baskets: {
          ...state.baskets,
          isLoading: false,
          error: errorMessage,
        },
      }));
    }
  },
});
