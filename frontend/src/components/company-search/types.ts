export type Company = {
    company_id: number
    name: string
    ticker: string
    markets: { market_id: number; name: string }[]
}
