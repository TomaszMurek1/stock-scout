import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { CurrencyRate, PortfolioInfo } from "./types"

export interface PortfolioSummaryProps {
    totalValue: number
    totalInvested: number
    totalGainLoss: number
    currency: string
    percentageChange: number
    currencyRates: CurrencyRate[]
}

export default function PortfolioSummary({
    totalValue,
    totalInvested,
    totalGainLoss,
    percentageChange,
}: PortfolioSummaryProps) {
    const isPositive = totalGainLoss >= 0

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Total Portfolio Value</div>
                <div className="text-2xl font-bold text-gray-900">
                    ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Total Invested</div>
                <div className="text-2xl font-bold text-gray-900">
                    ${totalInvested.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Total Gain/Loss</div>
                <div className={`text-2xl font-bold flex items-center ${isPositive ? "text-green-600" : "text-red-600"}`}>
                    {isPositive ? <ArrowUpRight className="mr-1 h-5 w-5" /> : <ArrowDownRight className="mr-1 h-5 w-5" />}$
                    {Math.abs(totalGainLoss).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Percentage Change</div>
                <div className={`text-2xl font-bold flex items-center ${isPositive ? "text-green-600" : "text-red-600"}`}>
                    {isPositive ? <ArrowUpRight className="mr-1 h-5 w-5" /> : <ArrowDownRight className="mr-1 h-5 w-5" />}
                    {Math.abs(percentageChange).toFixed(2)}%
                </div>
            </div>
        </div>
    )
}
