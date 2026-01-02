"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { apiClient } from "@/services/apiClient"
import { Loader2, X, Search } from "lucide-react"
import { Company } from "@/features/company-search/types"
import { SearchResultsDropdown } from "@/features/company-search/SearchResultsDropdown"

interface TickerSelectorProps {
    onSelect: (company: Company) => void
    placeholder?: string
    className?: string
}

export function TickerSelector({
    onSelect,
    placeholder = "Search for ticker...",
    className = "",
}: TickerSelectorProps) {
    const [search, setSearch] = useState("")
    const [results, setResults] = useState<Company[]>([])
    const [selected, setSelected] = useState<Company | null>(null)
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
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

    const fetchCompanies = useCallback(async (value: string) => {
        setLoading(true)
        try {
            // Only search database, no external search
            const response = await apiClient.get<Company[]>("/companies", {
                params: { search: value, include_external: false },
            })
            setResults(response.data)
            setIsOpen(true)
        } catch {
            setResults([])
            setIsOpen(false)
        }
        setLoading(false)
    }, [])

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
        }, 400)
    }

    const handleCompanySelect = (company: Company) => {
        setSelected(company)
        setSearch(`${company.ticker} — ${company.name}`)
        setResults([])
        setIsOpen(false)
        onSelect(company)
    }

    const handleClear = () => {
        setSelected(null)
        setSearch("")
        setResults([])
        setIsOpen(false)
    }

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                    type="text"
                    value={search}
                    onChange={onInput}
                    placeholder={placeholder}
                    className="flex h-10 w-full rounded-md border border-input bg-white pl-9 pr-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                )}
                {!loading && search && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Search Results Dropdown - no "Search More" option */}
            {!selected && isOpen && Boolean(search) && (
                <SearchResultsDropdown
                    results={results}
                    onSelect={handleCompanySelect}
                    showSearchMore={false}
                    emptyMessage={
                        !loading && results.length === 0
                            ? `No companies found for "${search}"`
                            : undefined
                    }
                />
            )}
        </div>
    )
}
