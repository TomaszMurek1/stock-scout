export interface WatchlistStock {
    company_id?: number
    ticker: string
    name: string
    sector?: string | null
    industry?: string | null
    added_at?: string | null
    market_data?: {
        last_price: number | null
        currency: string | null
        last_updated: string | null
    }
    note?: {
        research_status?: string | null
        sentiment_score?: number | null
        sentiment_trend?: string | null
        intrinsic_value_low?: number | null
        intrinsic_value_high?: number | null
        margin_of_safety?: number | null
        tags?: string[] | null
    } | null
    is_held?: boolean
    held_shares?: number | null
    average_price?: number | null
}
