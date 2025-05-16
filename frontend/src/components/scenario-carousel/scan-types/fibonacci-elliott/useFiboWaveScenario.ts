import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { ApiResp } from "./fiboWaves.types";

/**
 * Custom hook to fetch and cache the FiboWaveScenario data.
 * Returns TanStack Query fields plus a `refresh()` helper.
 */

export const fetchFiboWave = (ticker: string): Promise<ApiResp> =>
    apiClient
        .get<ApiResp>(`/fibo-waves/analyze/${ticker}`)
        .then(res => res.data);

export const useFiboWaveScenario = (ticker: string | undefined) => {
    const qc = useQueryClient();

    const query = useQuery<ApiResp, Error>({
        enabled: !!ticker,                      // only run when ticker is defined
        retry: 1,                               // one retry on failure
        queryKey: ["elliott", ticker],          // cache key
        queryFn: () => fetchFiboWave(ticker!),  // fetcher function
        staleTime: 5 * 60_000,                  // 5 minutes cache fresh
        gcTime: 15 * 60_000,                 // 15 minutes until garbage-collected
    });

    return {
        ...query,
        /** Invalidate cache to force refetch */
        refresh: () => qc.invalidateQueries({ queryKey: ["elliott", ticker] }),
    };
};
