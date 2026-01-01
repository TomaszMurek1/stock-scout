import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { ApiResp } from "./fiboWaves.types";

/**
 * Custom hook to fetch and cache the FiboWaveScenario data.
 * Returns TanStack Query fields plus a `refresh()` helper.
 */

export const fetchFiboWave = (ticker: string, pivotThreshold: number = 0.05): Promise<ApiResp> =>
    apiClient
        .get<ApiResp>(`/fibo-waves/analyze/${ticker}?pct=${pivotThreshold}`)
        .then(res => res.data);

export const useFiboWaveScenario = (ticker: string | undefined, pivotThreshold: number = 0.05) => {
    const qc = useQueryClient();

    const query = useQuery<ApiResp, Error>({
        enabled: !!ticker,
        retry: 1,
        queryKey: ["elliott", ticker, pivotThreshold], // Add threshold to key
        queryFn: () => fetchFiboWave(ticker!, pivotThreshold),
        staleTime: 5 * 60_000,                  // 5 minutes cache fresh
        gcTime: 15 * 60_000,                 // 15 minutes until garbage-collected
    });

    return {
        ...query,
        /** Invalidate cache to force refetch */
        refresh: () => qc.invalidateQueries({ queryKey: ["elliott", ticker, pivotThreshold] }),
    };
};
