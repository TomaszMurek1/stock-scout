export enum AlertType {
    PRICE_ABOVE = "PRICE_ABOVE",
    PRICE_BELOW = "PRICE_BELOW",
    PERCENT_CHANGE_UP = "PERCENT_CHANGE_UP",
    PERCENT_CHANGE_DOWN = "PERCENT_CHANGE_DOWN",
    SMA_50_ABOVE_SMA_200 = "SMA_50_ABOVE_SMA_200",
    SMA_50_BELOW_SMA_200 = "SMA_50_BELOW_SMA_200",
    SMA_50_APPROACHING_SMA_200 = "SMA_50_APPROACHING_SMA_200",
}

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
