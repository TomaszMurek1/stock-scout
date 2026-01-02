import { AlertType, Alert } from "@/features/portfolio-management/types/alert.types";

export interface AlertRow extends Alert {
    currentPrice?: number;
    currentSma?: { sma50?: number; sma200?: number };
    companyName: string;
    state: "triggered" | "snoozed" | "read" | "pending";
}

export const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return (
        date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
        " at " +
        date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    );
};

export const formatType = (type: AlertType) => {
    switch (type) {
        case AlertType.PRICE_ABOVE: return "Price Above";
        case AlertType.PRICE_BELOW: return "Price Below";
        case AlertType.PERCENT_CHANGE_UP: return "% Move Up";
        case AlertType.PERCENT_CHANGE_DOWN: return "% Move Down";
        case AlertType.SMA_50_ABOVE_SMA_200: return "Golden Cross";
        case AlertType.SMA_50_BELOW_SMA_200: return "Death Cross";
        case AlertType.SMA_50_APPROACHING_SMA_200: return "Approaching Cross";
        default: return type;
    }
};
