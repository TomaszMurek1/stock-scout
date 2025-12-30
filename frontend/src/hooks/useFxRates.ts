
import { useState, useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

// This is the response type the admin component expects
export interface FxRateHistoryPoint {
    date: string;
    close: number | string | null;
}

export interface FxBatchPairResponse {
    base: string;
    quote: string;
    historicalData: FxRateHistoryPoint[];
    note?: string;
}

export type FxBatchResponse = Record<string, FxBatchPairResponse>;

export const useFxRates = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const [data, setData] = useState<FxBatchResponse | null>(null);

    const getFxRatesBatch = useCallback(async (
        pairs: { base: string; quote: string }[],
        start?: string,
        end?: string
    ) => {
        setLoading(true);
        setError(null);
        setData(null);
        try {
            const payload = {
                pairs,
                start: start || undefined,
                end: end || undefined,
            };
            const response = await apiClient.post<FxBatchResponse>(
                '/fx-rate/batch',
                payload
            );
            setData(response.data);
            return response.data;
        } catch (err) {
            const errorMessage = (err as any)?.response?.data?.detail || (err as Error).message || "An unknown error occurred";
            const error = new Error(errorMessage);
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    return { getFxRatesBatch, loading, error, data };
};
