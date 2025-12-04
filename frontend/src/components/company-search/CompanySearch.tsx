"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { apiClient } from "@/services/apiClient"
import {
    ArrowRight,
    Loader2,
    TrendingUp,

} from "lucide-react"
import { SearchInput } from "./SearchInput"
import { SearchResultsDropdown } from "./SearchResultsDropdown"
import { Company } from "./types"
import { cn } from "@/lib/utils"

interface CompanySearchProps {
    actionLabel?: string
    actionLoading?: boolean
    onAction?: (company: Company) => Promise<void> | void
    onCompanySelected?: (company: Company | null) => void
    containerClassName?: string
    contentClassName?: string
}

export function CompanySearch({
    actionLabel = "Analyze Stock",
    actionLoading = false,
    onAction,
    onCompanySelected,
    containerClassName,
    contentClassName,
}: CompanySearchProps = {}) {
    const [search, setSearch] = useState("")
    const [results, setResults] = useState<Company[]>([])
    const [selected, setSelected] = useState<Company | null>(null)
    const [loading, setLoading] = useState(false)
    const [externalLoading, setExternalLoading] = useState(false)
    const [externalSearched, setExternalSearched] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const navigate = useNavigate()
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [wrapperRef])

    const fetchCompanies = useCallback(async (value: string, includeExternal = false) => {
        if (includeExternal) {
            setExternalLoading(true);
        } else {
            setLoading(true);
        }
        try {
            const response = await apiClient.get<Company[]>("/companies", {
                params: { search: value, include_external: includeExternal },
            })
            setResults(response.data)
            setIsOpen(true)
            setExternalSearched(includeExternal)
        } catch {
            setResults([])
            setIsOpen(false)
        }
        if (includeExternal) {
            setExternalLoading(false);
        } else {
            setLoading(false);
        }
    }, [])

    // Debounced input handler
    const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setSearch(value)
        setSelected(null)

        if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
        if (!value) {
            setResults([])
            setIsOpen(false)
            setExternalSearched(false)
            return
        }
        debounceTimeout.current = setTimeout(() => {
            fetchCompanies(value)
        }, 600)
    }

    // When a company is chosen
    const handleCompanySelect = (company: Company) => {
        setSelected(company)
        setSearch(`${company.ticker} — ${company.name}`)
        setResults([])
        setIsOpen(false)
        onCompanySelected?.(company)
    }

    const handleClear = () => {
        setSelected(null)
        setSearch("")
        setResults([])
        setIsOpen(false)
        onCompanySelected?.(null)
    }

    const handleAction = () => {
        if (!selected || actionLoading) {
            return
        }
        if (onAction) {
            onAction(selected)
            return
        }
        navigate(`/stock-details/${selected.ticker}`)
    }

    // For consistent icon on left side of input
    const primaryMarket = selected?.market?.name || ""

    return (
        <div ref={wrapperRef} className={cn("mx-auto px-4 py-6", containerClassName)}>
            <div className={cn("bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg p-4 shadow-sm", contentClassName)}>
                <div className="flex justify-between items-center">
                    {/* Left side - Icon and Search */}
                    <div className="flex items-center flex-1 mr-4">
                        <div className="flex items-center mr-3 flex-shrink-0">
                            <TrendingUp className="h-6 w-6 text-gray-700 mr-2" />
                            <span className="text-gray-700 font-medium">Search</span>
                        </div>
                        <div className="relative flex-1 max-w-2xl mx-auto">
                            <SearchInput
                                search={search}
                                onInput={onInput}
                                selected={selected}
                                onClear={handleClear}
                                loading={loading}
                                placeholder="Search companies by name or ticker..."
                                primaryMarket={primaryMarket}
                            />

                            {/* Search Results Dropdown */}
                            {!selected && isOpen && Boolean(search) && (
                                <SearchResultsDropdown
                                    results={results}
                                    onSelect={handleCompanySelect}
                                    showSearchMore={
                                        !selected &&
                                        isOpen &&
                                        !externalSearched &&
                                        Boolean(search)
                                    }
                                    loadingMore={externalLoading}
                                    onSearchMore={() => fetchCompanies(search, true)}
                                    emptyMessage={
                                        !loading && results.length === 0
                                            ? `No companies found for "${search}"`
                                            : undefined
                                    }
                                />
                            )}
                        </div>
                    </div>

                    {/* Right side - Action Button */}
                    <div className="flex items-center">
                        <button
                            onClick={handleAction}
                            disabled={!selected || actionLoading}
                            className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center shadow-sm hover:shadow-md disabled:shadow-none w-48 justify-center"
                        >
                            {actionLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {actionLabel}
                                </>
                            ) : (
                                <>
                                    {actionLabel}
                                    <ArrowRight className="ml-1 h-4 w-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
