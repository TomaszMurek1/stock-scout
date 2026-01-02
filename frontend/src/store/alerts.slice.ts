import { StateCreator } from "zustand";
import { Alert, AlertCreate, AlertUpdate } from "@/features/portfolio-management/types/alert.types";
import { apiClient } from "@/services/apiClient";

export interface AlertsSlice {
    alerts: Alert[];
    isLoadingAlerts: boolean;
    setAlerts: (alerts: Alert[]) => void;
    createAlert: (alert: AlertCreate) => Promise<void>;
    updateAlert: (id: number, update: AlertUpdate) => Promise<void>;
    deleteAlert: (id: number) => Promise<void>;

    clearAllAlerts: () => Promise<void>;
    fetchAlerts: () => Promise<void>;
}

export const createAlertsSlice: StateCreator<AlertsSlice> = (set, get) => ({
    alerts: [],
    isLoadingAlerts: false,

    setAlerts: (alerts) => set({ alerts }),

    fetchAlerts: async () => {
        try {
            const { data } = await apiClient.get<Alert[]>("/alerts/");
            set({ alerts: data });
        } catch (error) {
            console.error("Failed to fetch alerts", error);
        }
    },

    createAlert: async (payload) => {
        set({ isLoadingAlerts: true });
        try {
            const { data } = await apiClient.post<Alert>("/alerts/", payload);
            set((state) => ({ alerts: [...state.alerts, data], isLoadingAlerts: false }));
        } catch (error) {
            console.error("Failed to create alert", error);
            set({ isLoadingAlerts: false });
            throw error;
        }
    },

    updateAlert: async (id, update) => {
        // Optimistic update
        set((state) => ({
            alerts: state.alerts.map((a) => (a.id === id ? { ...a, ...update } : a)),
        }));

        try {
            await apiClient.put<Alert>(`/alerts/${id}`, update);
        } catch (error) {
            console.error("Failed to update alert", error);
            // Revert on failure (could be improved with more robust revert logic)
            // For now, simpler to just re-fetch in real app, but optimistic is fine for small stuff
        }
    },

    deleteAlert: async (id) => {
        // Optimistic delete
        set((state) => ({
            alerts: state.alerts.filter((a) => a.id !== id),
        }));

        try {
            await apiClient.delete(`/alerts/${id}`);
        } catch (error) {
            console.error("Failed to delete alert", error);
        }
    },

    clearAllAlerts: async () => {
        set({ alerts: [] });
        try {
            await apiClient.delete("/alerts/");
        } catch (error) {
            console.error("Failed to clear all alerts", error);
        }
    },
});
