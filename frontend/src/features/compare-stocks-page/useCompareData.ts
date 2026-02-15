import { apiClient } from "@/services/apiClient";
import { useQuery } from "@tanstack/react-query";

export const useCompareData = (tickerA: string, tickerB: string) =>
    useQuery({
        queryKey: ["compare", tickerA, tickerB],
        queryFn: async () => {
            // apiClient is pre‐configured with baseURL "/api"
            const response = await apiClient.get(
                `/compare/${tickerA.toUpperCase()}/${tickerB.toUpperCase()}`
            );
            if (response.status !== 200) {
                throw new Error(
                    `Compare API failed: ${response.status} ${response.statusText}`
                );
            }
            return response.data as {
                as_of: string;
                a: any;
                b: any;
            };
        },
        // you can also add staleTime, retry, etc. here
    });