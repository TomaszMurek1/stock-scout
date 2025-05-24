import {
    ArrowRight,
} from "lucide-react"
import { Company } from "./types"
import { getMarketColor, getMarketIcon } from "./helpers"

export function SearchResultItem({
    company,
    onSelect,
}: {
    company: Company
    onSelect: (c: Company) => void
}) {
    const primaryMarket = company.markets[0]?.name || ""
    const MarketIcon = getMarketIcon(primaryMarket)
    const colorClass = getMarketColor(primaryMarket)

    return (
        <div
            key={company.company_id}
            className="px-4 py-3 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 cursor-pointer transition-all duration-200 hover:shadow-sm group"
            onClick={() => onSelect(company)}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div
                        className={`flex-shrink-0 w-8 h-8 bg-gradient-to-br ${colorClass} rounded-full flex items-center justify-center`}
                    >
                        <MarketIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 text-sm">
                            <span className="font-bold text-gray-900">{company.ticker}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-700 truncate">{company.name}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                                {company.markets.map((m) => m.name).join(", ")}
                            </span>
                        </div>
                    </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
            </div>
        </div>
    )
}
