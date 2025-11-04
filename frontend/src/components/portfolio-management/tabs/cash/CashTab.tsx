"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface CashTransaction {
    id: string
    date: string
    type: "deposit" | "withdrawal"
    amount: number
    description: string
}

export default function CashBalanceTracker() {
    const [cashBalance, setCashBalance] = useState(12500.75)
    const [transactions, setTransactions] = useState<CashTransaction[]>([
        {
            id: "1",
            date: "2023-04-15",
            type: "deposit",
            amount: 5000,
            description: "Deposit from Bank Account ****1234",
        },
        {
            id: "2",
            date: "2023-04-01",
            type: "withdrawal",
            amount: 1000,
            description: "Withdrawal to Bank Account ****1234",
        },
        {
            id: "3",
            date: "2023-03-15",
            type: "deposit",
            amount: 10000,
            description: "Initial deposit",
        },
    ])

    const [isAddFundsOpen, setIsAddFundsOpen] = useState(false)
    const [transactionType, setTransactionType] = useState<"deposit" | "withdrawal">("deposit")
    const [amount, setAmount] = useState("")
    const [description, setDescription] = useState("")

    const handleAddTransaction = () => {
        if (!amount || Number.parseFloat(amount) <= 0) return

        const newTransaction: CashTransaction = {
            id: Date.now().toString(),
            date: new Date().toISOString().split("T")[0],
            type: transactionType,
            amount: Number.parseFloat(amount),
            description,
        }

        setTransactions([newTransaction, ...transactions])

        if (transactionType === "deposit") {
            setCashBalance(cashBalance + Number.parseFloat(amount))
        } else {
            setCashBalance(cashBalance - Number.parseFloat(amount))
        }

        setAmount("")
        setDescription("")
        setIsAddFundsOpen(false)
    }

    return (
        <div className="space-y-6">
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">Available Cash Balance</h3>
                        <p className="text-3xl font-bold text-gray-900 mt-2">${cashBalance.toFixed(2)}</p>
                    </div>
                    <Dialog open={isAddFundsOpen} onOpenChange={setIsAddFundsOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary text-white hover:bg-primary/90">
                                <Plus className="mr-2 h-4 w-4" />
                                Add/Withdraw Funds
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add or Withdraw Funds</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="flex space-x-4">
                                    <Button
                                        variant={transactionType === "deposit" ? "default" : "outline"}
                                        className={transactionType === "deposit" ? "bg-primary text-white" : ""}
                                        onClick={() => setTransactionType("deposit")}
                                    >
                                        <ArrowDownCircle className="mr-2 h-4 w-4" />
                                        Deposit
                                    </Button>
                                    <Button
                                        variant={transactionType === "withdrawal" ? "default" : "outline"}
                                        className={transactionType === "withdrawal" ? "bg-primary text-white" : ""}
                                        onClick={() => setTransactionType("withdrawal")}
                                    >
                                        <ArrowUpCircle className="mr-2 h-4 w-4" />
                                        Withdraw
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="amount" className="text-sm font-medium">
                                        Amount
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <DollarSign className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            id="amount"
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="description" className="text-sm font-medium">
                                        Description
                                    </label>
                                    <input
                                        id="description"
                                        type="text"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                                        placeholder="e.g. Deposit from bank account"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button className="bg-primary text-white hover:bg-primary/90" onClick={handleAddTransaction}>
                                    {transactionType === "deposit" ? "Add Funds" : "Withdraw Funds"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-xl font-semibold text-gray-800">Cash Transaction History</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Description
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {transactions.map((transaction) => (
                                <tr key={transaction.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {transaction.type === "deposit" ? (
                                                <ArrowDownCircle className="h-5 w-5 text-green-500" />
                                            ) : (
                                                <ArrowUpCircle className="h-5 w-5 text-red-500" />
                                            )}
                                            <span
                                                className={`ml-2 px-2 py-1 text-xs rounded-full ${transaction.type === "deposit" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                                    }`}
                                            >
                                                {transaction.type === "deposit" ? "Deposit" : "Withdrawal"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ${transaction.amount.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
