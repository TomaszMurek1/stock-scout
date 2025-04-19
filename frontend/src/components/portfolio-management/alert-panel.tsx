"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Bell, CheckCircle, Clock, X } from "lucide-react"

interface Alert {
    id: string
    symbol: string
    message: string
    type: "price" | "technical" | "volume"
    date: string
    read: boolean
    snoozed: boolean
}

export default function AlertsPanel() {
    const [alerts, setAlerts] = useState<Alert[]>([
        {
            id: "1",
            symbol: "AAPL",
            message: "AAPL dropped 32% from recent high",
            type: "price",
            date: "2023-04-15T10:30:00",
            read: false,
            snoozed: false,
        },
        {
            id: "2",
            symbol: "GOOGL",
            message: "GOOGL triggered a golden cross",
            type: "technical",
            date: "2023-04-14T14:45:00",
            read: true,
            snoozed: false,
        },
        {
            id: "3",
            symbol: "TSLA",
            message: "TSLA trading volume 3x above average",
            type: "volume",
            date: "2023-04-13T09:15:00",
            read: false,
            snoozed: true,
        },
        {
            id: "4",
            symbol: "MSFT",
            message: "MSFT crossed below 200-day moving average",
            type: "technical",
            date: "2023-04-12T11:20:00",
            read: false,
            snoozed: false,
        },
        {
            id: "5",
            symbol: "AMZN",
            message: "AMZN up 15% from recent low",
            type: "price",
            date: "2023-04-11T15:30:00",
            read: true,
            snoozed: false,
        },
    ])

    const markAsRead = (id: string) => {
        setAlerts(alerts.map((alert) => (alert.id === id ? { ...alert, read: true } : alert)))
    }

    const toggleSnooze = (id: string) => {
        setAlerts(alerts.map((alert) => (alert.id === id ? { ...alert, snoozed: !alert.snoozed } : alert)))
    }

    const clearAlert = (id: string) => {
        setAlerts(alerts.filter((alert) => alert.id !== id))
    }

    const clearAllAlerts = () => {
        setAlerts([])
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return (
            date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
            " at " +
            date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        )
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case "price":
                return "bg-red-100 text-red-800"
            case "technical":
                return "bg-blue-100 text-blue-800"
            case "volume":
                return "bg-purple-100 text-purple-800"
            default:
                return "bg-gray-100 text-gray-800"
        }
    }

    return (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <div className="flex items-center">
                    <Bell className="mr-2 h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold text-gray-800">Alerts & Notifications</h2>
                    <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-800">
                        {alerts.filter((a) => !a.read).length} new
                    </span>
                </div>
                <Button variant="outline" size="sm" className="text-gray-600" onClick={clearAllAlerts}>
                    Clear All
                </Button>
            </div>

            {alerts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No alerts at this time.</div>
            ) : (
                <div className="divide-y divide-gray-200">
                    {alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`p-4 ${alert.read ? "bg-white" : "bg-gray-50"} ${alert.snoozed ? "opacity-60" : "opacity-100"
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-start space-x-3">
                                    <div className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(alert.type)}`}>
                                        {alert.symbol}
                                    </div>
                                    <div>
                                        <p className={`text-sm ${alert.read ? "text-gray-600" : "text-gray-900 font-medium"}`}>
                                            {alert.message}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">{formatDate(alert.date)}</p>
                                    </div>
                                </div>
                                <div className="flex space-x-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-gray-500 hover:text-gray-700"
                                        onClick={() => markAsRead(alert.id)}
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`${alert.snoozed ? "text-amber-500" : "text-gray-500 hover:text-gray-700"}`}
                                        onClick={() => toggleSnooze(alert.id)}
                                    >
                                        <Clock className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-gray-500 hover:text-gray-700"
                                        onClick={() => clearAlert(alert.id)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
