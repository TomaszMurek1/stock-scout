export enum AlertType {
    PRICE_ABOVE = "PRICE_ABOVE",
    PRICE_BELOW = "PRICE_BELOW",
    PERCENT_CHANGE_UP = "PERCENT_CHANGE_UP",
    PERCENT_CHANGE_DOWN = "PERCENT_CHANGE_DOWN",
    SMA_50_ABOVE_SMA_200 = "SMA_50_ABOVE_SMA_200",
    SMA_50_BELOW_SMA_200 = "SMA_50_BELOW_SMA_200",
    SMA_50_APPROACHING_SMA_200 = "SMA_50_APPROACHING_SMA_200",
    // Auto-generated SMA monitoring types
    SMA_50_CROSS_ABOVE = "SMA_50_CROSS_ABOVE",
    SMA_50_CROSS_BELOW = "SMA_50_CROSS_BELOW",
    SMA_200_CROSS_ABOVE = "SMA_200_CROSS_ABOVE",
    SMA_200_CROSS_BELOW = "SMA_200_CROSS_BELOW",
    SMA_50_DISTANCE = "SMA_50_DISTANCE",
    SMA_200_DISTANCE = "SMA_200_DISTANCE",
}

export const AUTO_SMA_TYPES = new Set([
    AlertType.SMA_50_CROSS_ABOVE,
    AlertType.SMA_50_CROSS_BELOW,
    AlertType.SMA_200_CROSS_ABOVE,
    AlertType.SMA_200_CROSS_BELOW,
    AlertType.SMA_50_DISTANCE,
    AlertType.SMA_200_DISTANCE,
]);

export interface Alert {
    id: number;
    user_id: number;
    company_id: number | null;
    ticker: string;
    alert_type: AlertType;
    threshold_value: number;
    message: string | null;
    is_active: boolean;
    is_triggered: boolean;
    last_triggered_at: string | null;
    is_read: boolean;
    snoozed_until: string | null;
    created_at: string;
}

export interface AlertCreate {
    ticker: string;
    alert_type: AlertType;
    threshold_value: number;
    message?: string;
}

export interface AlertUpdate {
    is_active?: boolean;
    is_read?: boolean;
    snoozed_until?: string | null;
}
