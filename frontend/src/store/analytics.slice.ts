import { StateCreator } from "zustand";
import { apiClient } from "@/services/apiClient";
import { IBreakEvenPointData } from "@/components/scenario-carousel/scan-types/break-even-point/break-even-point-output/break-even-point-output.types";

type BreakEvenCacheEntry = {
  data: IBreakEvenPointData[];
  fetchedAt: string;
};

const isSameDay = (iso: string) => {
  const cached = new Date(iso);
  const today = new Date();
  return (
    cached.getUTCFullYear() === today.getUTCFullYear() &&
    cached.getUTCMonth() === today.getUTCMonth() &&
    cached.getUTCDate() === today.getUTCDate()
  );
};

export interface AnalyticsSlice {
  analysis: {
    breakEven: {
      cachePerBasketIdAndThreshold: Record<string, BreakEvenCacheEntry>;
      isLoading: boolean;
      error?: string;
    };
  };
  fetchBreakEven: (basketIds: number[], thresholdPct: number) => Promise<IBreakEvenPointData[]>;
}

export const createAnalyticsSlice: StateCreator<AnalyticsSlice, [["zustand/devtools", never]]> = (
  set,
  get
) => ({
  analysis: {
    breakEven: {
      cachePerBasketIdAndThreshold: {},
      isLoading: false,
      error: undefined,
    },
  },
  async fetchBreakEven(basketIds: number[], thresholdPct: number) {
    const key = `${basketIds.slice().sort((a, b) => a - b).join("-")}|${thresholdPct}`;
    const cached = get().analysis.breakEven.cachePerBasketIdAndThreshold[key];
    if (cached && isSameDay(cached.fetchedAt)) {
      return cached.data;
    }

    set(
      (state) => ({
        analysis: {
          ...state.analysis,
          breakEven: {
            ...state.analysis.breakEven,
            isLoading: true,
            error: undefined,
          },
        },
      }),
      false,
      "breakEven/fetchStart"
    );

    try {
      const { data } = await apiClient.post<{
        status: string;
        data: IBreakEvenPointData[];
      }>("/fundamentals/break-even-companies?months=12", {
        basket_ids: basketIds,
        threshold_pct: thresholdPct,
      });

      const result = data?.data ?? [];
      set(
        (state) => ({
          analysis: {
            ...state.analysis,
            breakEven: {
              ...state.analysis.breakEven,
              cachePerBasketIdAndThreshold: {
                ...state.analysis.breakEven.cachePerBasketIdAndThreshold,
                [key]: { data: result, fetchedAt: new Date().toISOString() },
              },
              isLoading: false,
            },
          },
        }),
        false,
        "breakEven/fetchSuccess"
      );
      return result;
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        "Failed to run Break-even scan";
      set(
        (state) => ({
          analysis: {
            ...state.analysis,
            breakEven: {
              ...state.analysis.breakEven,
              isLoading: false,
              error: message,
            },
          },
        }),
        false,
        "breakEven/fetchError"
      );
      throw error;
    }
  },
});
