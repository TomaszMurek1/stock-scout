export type Company = {
    company_id?: number | null
    name: string
    ticker: string
    market?: { market_id?: number | null; name: string } | null
    source?: "db" | "external"
    currency?: string | null
}
