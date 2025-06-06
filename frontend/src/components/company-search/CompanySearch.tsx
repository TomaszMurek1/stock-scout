"use client"

import React, { useState, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { apiClient } from "@/services/apiClient"
import {
    ArrowRight,
    TrendingUp,

} from "lucide-react"
import { SearchInput } from "./SearchInput"
import { SearchResultsDropdown } from "./SearchResultsDropdown"
import { Company } from "./types"
import { NoResultsDropdown } from "./NoResultDropdown"


export function CompanySearch() {
    const [search, setSearch] = useState("")
    const [results, setResults] = useState<Company[]>([])
    const [selected, setSelected] = useState<Company | null>(null)
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const navigate = useNavigate()
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null)

    const fetchCompanies = useCallback(async (value: string) => {
        setLoading(true)
        try {
            const response = await apiClient.get<Company[]>("/companies", {
                params: { search: value },
            })
            setResults(response.data)
            setIsOpen(true)
        } catch {
            setResults([])
            setIsOpen(false)
        }
        setLoading(false)
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
    }

    const handleClear = () => {
        setSelected(null)
        setSearch("")
        setResults([])
        setIsOpen(false)
    }

    const handleNavigate = () => {
        if (selected) {
            navigate(`/stock-details/${selected.ticker}`)
        }
    }

    // For consistent icon on left side of input
    const primaryMarket = selected?.markets?.name || ""

    return (
        <div className="mx-auto px-4 py-6">
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg p-4 shadow-sm">
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
                            {!selected && isOpen && results.length > 0 && (
                                <SearchResultsDropdown results={results} onSelect={handleCompanySelect} />
                            )}

                            {/* No Results */}
                            {!loading && search && !selected && isOpen && results.length === 0 && (
                                <NoResultsDropdown search={search} />
                            )}
                        </div>
                    </div>

                    {/* Right side - Action Button */}
                    <div className="flex items-center">
                        <button
                            onClick={handleNavigate}
                            disabled={!selected}
                            className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center shadow-sm hover:shadow-md disabled:shadow-none"
                        >
                            Analyze Stock
                            <ArrowRight className="ml-1 h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
