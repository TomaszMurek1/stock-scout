"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { Stock } from "./types"

interface AddStockModalProps {
    isOpen: boolean
    onClose: () => void
    onAdd: (stock: Omit<Stock, "id">) => void
}

export default function AddStockModal({ isOpen, onClose, onAdd }: AddStockModalProps) {
    const [symbol, setSymbol] = useState("")
    const [name, setName] = useState("")
    const [shares, setShares] = useState("")
    const [purchasePrice, setPurchasePrice] = useState("")

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        onAdd({
            symbol: symbol.toUpperCase(),
            name,
            shares: Number(shares),
            purchasePrice: Number(purchasePrice),
            currentPrice: Number(purchasePrice), // Default to purchase price, would be updated with real data
        })

        // Reset form
        setSymbol("")
        setName("")
        setShares("")
        setPurchasePrice("")
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">Add Stock to Portfolio</h2>
                    <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-4">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-1">
                                Stock Symbol
                            </label>
                            <input
                                id="symbol"
                                type="text"
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                                placeholder="e.g. AAPL"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Company Name
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                                placeholder="e.g. Apple Inc."
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="shares" className="block text-sm font-medium text-gray-700 mb-1">
                                Number of Shares
                            </label>
                            <input
                                id="shares"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={shares}
                                onChange={(e) => setShares(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                                placeholder="e.g. 10"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-1">
                                Purchase Price per Share ($)
                            </label>
                            <input
                                id="purchasePrice"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={purchasePrice}
                                onChange={(e) => setPurchasePrice(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                                placeholder="e.g. 150.75"
                                required
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <Button type="button" variant="outline" onClick={onClose} className="border-gray-300 text-gray-700">
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-gray-800 text-white hover:bg-gray-700">
                            Add Stock
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
