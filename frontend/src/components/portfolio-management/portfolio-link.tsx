"use client"

import type React from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "@/services/AuthContext"
import { BarChart3 } from "lucide-react"

const PortfolioLink: React.FC = () => {
    const { isAuthenticated } = useAuth()
    const location = useLocation()

    if (!isAuthenticated || location.pathname === "/portfolio-management") return null

    return (
        <div className="mx-auto px-4 py-6">
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg p-4 shadow-sm flex justify-between items-center">
                <div className="flex items-center">
                    <BarChart3 className="h-6 w-6 text-gray-700 mr-2" />
                    <span className="text-gray-700 font-medium">Your Investment Portfolio</span>
                </div>
                <Link
                    to="/portfolio-management"
                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center"
                >
                    Manage Portfolio
                </Link>
            </div>
        </div>
    )
}

export default PortfolioLink