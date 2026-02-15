import { AlertType, Alert } from "@/features/portfolio-management/types/alert.types";
import { TFunction } from "i18next";

export interface AlertRow extends Alert {
    currentPrice?: number;
    currentSma?: { sma50?: number; sma200?: number };
    companyName: string;
    state: "triggered" | "snoozed" | "read" | "pending";
}

export const formatDate = (dateString: string, t?: TFunction) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    // Use current locale if possible, but for now we rely on browser default or passed locale if we had one
    // Actually, let's use standard Intl with undefined locale (browser default) or explicit if we want.
    // To match "Oct 24 at 10:30 PM" style:
    const datePart = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const timePart = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${datePart} ${t ? t("common.at") : "at"} ${timePart}`;
};

export const formatType = (type: AlertType, t: TFunction) => {
    switch (type) {
        case AlertType.PRICE_ABOVE: return t("portfolio.alerts.type.price_above");
        case AlertType.PRICE_BELOW: return t("portfolio.alerts.type.price_below");
        case AlertType.PERCENT_CHANGE_UP: return t("portfolio.alerts.type.percent_up");
        case AlertType.PERCENT_CHANGE_DOWN: return t("portfolio.alerts.type.percent_down");
        case AlertType.SMA_50_ABOVE_SMA_200: return t("portfolio.alerts.type.golden_cross");
        case AlertType.SMA_50_BELOW_SMA_200: return t("portfolio.alerts.type.death_cross");
        case AlertType.SMA_50_APPROACHING_SMA_200: return t("portfolio.alerts.type.approaching_cross");
        default: return type;
    }
};
