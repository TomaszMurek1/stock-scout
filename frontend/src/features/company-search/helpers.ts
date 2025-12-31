import { Building2, DollarSign, Globe } from "lucide-react"

export function getMarketIcon(marketName: string) {
    const market = marketName.toLowerCase()
    if (market.includes("nasdaq") || market.includes("nyse") || market.includes("us")) {
        return DollarSign
    }
    if (market.includes("london") || market.includes("lse") || market.includes("uk")) {
        return Building2
    }
    return Globe
}

export function getMarketColor(marketName: string) {
    const market = marketName.toLowerCase()
    if (market.includes("nasdaq") || market.includes("nyse") || market.includes("us")) {
        return "from-green-600 to-green-800"
    }
    if (market.includes("london") || market.includes("lse") || market.includes("uk")) {
        return "from-blue-600 to-blue-800"
    }
    return "from-gray-600 to-gray-800"
}