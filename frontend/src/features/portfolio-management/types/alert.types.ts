export enum AlertType {
    PRICE_ABOVE = "price_above",
    PRICE_BELOW = "price_below",
    PERCENT_CHANGE_UP = "percent_change_up",
    PERCENT_CHANGE_DOWN = "percent_change_down",
    SMA_50_ABOVE_SMA_200 = "sma_50_above_sma_200",
    SMA_50_BELOW_SMA_200 = "sma_50_below_sma_200",
    SMA_50_APPROACHING_SMA_200 = "sma_50_approaching_sma_200",
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
