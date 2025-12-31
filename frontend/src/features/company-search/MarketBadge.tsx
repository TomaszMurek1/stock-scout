import { getMarketColor, getMarketIcon } from "./helpers"

export function MarketBadge({ marketName }: { marketName: string }) {
    const MarketIcon = getMarketIcon(marketName)
    const colorClass = getMarketColor(marketName)
    return (
        <div className={`w-5 h-5 bg-gradient-to-br ${colorClass} rounded-full flex items-center justify-center`}>
            <MarketIcon className="h-3.5 w-3.5 text-white" />
        </div>
    )
}