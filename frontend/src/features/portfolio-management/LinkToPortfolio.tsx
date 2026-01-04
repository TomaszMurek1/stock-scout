"use client"

import type React from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../../services/Auth.hooks"
import { BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

interface LinkToPortfolioProps {
    containerClassName?: string
    contentClassName?: string
}

export const LinkToPortfolio: React.FC<LinkToPortfolioProps> = ({
    containerClassName,
    contentClassName
}) => {
    const { isAuthenticated } = useAuth()
    const location = useLocation()
    const { t } = useTranslation()

    if (!isAuthenticated || location.pathname === "/portfolio-management") return null

    return (
        <div className={cn("mx-auto px-4 py-6", containerClassName)}>
            <div className={cn("bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg p-4 shadow-sm flex justify-between items-center", contentClassName)}>
                <div className="flex items-center">
                    <BarChart3 className="h-6 w-6 text-gray-700 mr-2" />
                    <span className="text-gray-700 font-medium">{t("link_to_portfolio.title")}</span>
                </div>
                <Link
                    to="/portfolio-management"
                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center w-48 justify-center"
                >
                    {t("link_to_portfolio.action")}
                </Link>
            </div>
        </div>
    )
}