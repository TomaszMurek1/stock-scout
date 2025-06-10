"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IByHolding } from "../../types"

interface HoldingsTabProps {

    byHolding?: IByHolding
    onRemove: (id: string) => void
}


export default function HoldingsTab({ byHolding, onRemove }: HoldingsTabProps) {
    if (!byHolding || Object.keys(byHolding).length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">
                No stocks in your portfolio. Add some stocks to get started.
            </div>
        )
    }

    const rows = Object.entries(byHolding).map(([ticker, data]) => ({
        ticker,
        ...data
    }));

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invested</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gain/Loss</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {rows.map((row) => {
                        const {
                            ticker,
                            quantity,
                            holdingCurrency,
                            investedValueInHolding,
                            investedValueInPortfolio,
                            currentValueInHolding,
                            currentValueInPortfolio,
                            gainLossInHolding,
                            gainLossInPortfolio,
                            isPositive
                        } = row;

                        return (
                            <tr key={ticker}>
                                <td className="px-6 py-4 whitespace-nowrap font-medium">{ticker}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{quantity}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {investedValueInHolding.toLocaleString(undefined, { style: 'currency', currency: holdingCurrency })} <br />
                                    ({investedValueInPortfolio.toLocaleString(undefined, { style: 'currency', currency: "PLN" })})
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {currentValueInHolding.toLocaleString(undefined, { style: 'currency', currency: holdingCurrency })} <br />
                                    ({currentValueInPortfolio.toLocaleString(undefined, { style: 'currency', currency: "PLN" })})
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap ${isPositive ? "text-green-600" : "text-red-600"}`}>
                                    {gainLossInHolding.toLocaleString(undefined, { style: 'currency', currency: holdingCurrency })} <br />
                                    ({gainLossInPortfolio.toLocaleString(undefined, { style: 'currency', currency: "PLN" })})
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onRemove(ticker)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}