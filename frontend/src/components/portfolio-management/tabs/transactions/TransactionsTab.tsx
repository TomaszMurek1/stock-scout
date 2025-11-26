"use client"

import { useState } from "react"
import { ArrowDownCircle, ArrowUpCircle, DollarSign, Filter } from "lucide-react"

type TransactionType = "buy" | "sell" | "dividend" | "deposit" | "withdrawal"

interface Transaction {
    id: string
    date: string
    type: TransactionType
    symbol: string
    shares?: number
    price?: number
    amount: number
    description: string
}

export default function TransactionsHistory() {
    const [transactions] = useState<Transaction[]>([
        {
            id: "1",
            date: "2023-04-15",
            type: "buy",
            symbol: "AAPL",
            shares: 5,
            price: 170.25,
            amount: 851.25,
            description: "Buy 5 shares of Apple Inc.",
        },
        {
            id: "2",
            date: "2023-04-10",
            type: "deposit",
            symbol: "",
            amount: 5000,
            description: "Deposit from Bank Account ****1234",
        },
        {
            id: "3",
            date: "2023-04-05",
            type: "dividend",
            symbol: "MSFT",
            amount: 25.5,
            description: "Dividend payment from Microsoft Corporation",
        },
        {
            id: "4",
            date: "2023-04-01",
            type: "sell",
            symbol: "TSLA",
            shares: 2,
            price: 210.75,
            amount: 421.5,
            description: "Sell 2 shares of Tesla, Inc.",
        },
        {
            id: "5",
            date: "2023-03-25",
            type: "withdrawal",
            symbol: "",
            amount: 1000,
            description: "Withdrawal to Bank Account ****1234",
        },
    ])

    const [filter, setFilter] = useState<TransactionType | "all">("all")

    const filteredTransactions = filter === "all" ? transactions : transactions.filter((t) => t.type === filter)

    const getTypeIcon = (type: TransactionType) => {
        switch (type) {
            case "buy":
                return <ArrowDownCircle className="h-5 w-5 text-green-500" />
            case "sell":
                return <ArrowUpCircle className="h-5 w-5 text-red-500" />
            case "dividend":
                return <DollarSign className="h-5 w-5 text-blue-500" />
            case "deposit":
                return <ArrowDownCircle className="h-5 w-5 text-purple-500" />
            case "withdrawal":
                return <ArrowUpCircle className="h-5 w-5 text-orange-500" />
        }
    }

    const getTypeLabel = (type: TransactionType) => {
        return type.charAt(0).toUpperCase() + type.slice(1)
    }

    const getTypeColor = (type: TransactionType) => {
        switch (type) {
            case "buy":
                return "bg-green-100 text-green-800"
            case "sell":
                return "bg-red-100 text-red-800"
            case "dividend":
                return "bg-blue-100 text-blue-800"
            case "deposit":
                return "bg-purple-100 text-purple-800"
            case "withdrawal":
                return "bg-amber-100 text-amber-800"
        }
    }

    return (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Transaction History</h2>
                <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <select
                        className="text-sm border-gray-300 rounded-md"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as TransactionType | "all")}
                    >
                        <option value="all">All Transactions</option>
                        <option value="buy">Buys</option>
                        <option value="sell">Sells</option>
                        <option value="dividend">Dividends</option>
                        <option value="deposit">Deposits</option>
                        <option value="withdrawal">Withdrawals</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTransactions.map((transaction) => (
                            <tr key={transaction.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.date}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        {getTypeIcon(transaction.type)}
                                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getTypeColor(transaction.type)}`}>
                                            {getTypeLabel(transaction.type)}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{transaction.symbol}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {transaction.shares !== undefined ? transaction.shares : "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {transaction.price !== undefined ? `$${transaction.price.toFixed(2)}` : "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${transaction.amount.toFixed(2)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
