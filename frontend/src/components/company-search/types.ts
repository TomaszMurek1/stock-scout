export type Company = {
    company_id: number
    name: string
    ticker: string
    market?: { market_id: number; name: string } | null
}
