"use client"

import React, { useState, useCallback } from "react"
import { apiClient } from "@/services/apiClient"
import { Company } from "@/features/company-search/types"
import { SearchResultsDropdown } from "@/features/company-search/SearchResultsDropdown"
import { BaseSearchInput, useSearchLogic } from "./BaseSearchInput"

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
    const [results, setResults] = useState<Company[]>([])
    const [selected, setSelected] = useState<Company | null>(null)
    const [loading, setLoading] = useState(false)

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

    const {
        search,
        setSearch,
        isOpen,
        setIsOpen,
        wrapperRef,
        onInput,
        handleClear: baseClear,
    } = useSearchLogic(fetchCompanies, 400)

    const handleCompanySelect = (company: Company) => {
        setSelected(company)
        setSearch(`${company.ticker} — ${company.name}`)
        setResults([])
        setIsOpen(false)
        onSelect(company)
    }

    const handleClear = () => {
        setSelected(null)
        setResults([])
        baseClear()
    }

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <BaseSearchInput
                search={search}
                onInput={onInput}
                onClear={handleClear}
                loading={loading}
                placeholder={placeholder}
            />

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
