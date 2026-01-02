"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { Loader2, X, Search } from "lucide-react"

interface BaseSearchInputProps {
    search: string
    onInput: (e: React.ChangeEvent<HTMLInputElement>) => void
    onClear: () => void
    loading: boolean
    placeholder: string
    className?: string
    leftIcon?: React.ReactNode
    showClearButton?: boolean
}

/**
 * Shared search input component with common styling and behavior
 * Used by both TickerSelector and CompanySearch (SearchInput)
 */
export function BaseSearchInput({
    search,
    onInput,
    onClear,
    loading,
    placeholder,
    className = "",
    leftIcon,
    showClearButton = true,
}: BaseSearchInputProps) {
    return (
        <div className="relative">
            {/* Left icon */}
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 flex items-center justify-center pointer-events-none">
                {leftIcon || <Search className="h-4 w-4 text-gray-400" />}
            </div>

            {/* Input field */}
            <input
                type="text"
                value={search}
                onChange={onInput}
                placeholder={placeholder}
                className={`flex h-10 w-full rounded-md border border-input bg-white pl-9 pr-9 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
                autoComplete="off"
                spellCheck={false}
            />

            {/* Loading spinner or clear button */}
            {loading ? (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            ) : (
                showClearButton && search && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )
            )}
        </div>
    )
}

/**
 * Hook for common search logic (debouncing, click outside detection)
 */
export function useSearchLogic(
    fetchFunction: (value: string) => Promise<void>,
    debounceMs: number = 400
) {
    const [search, setSearch] = useState("")
    const [isOpen, setIsOpen] = useState(false)
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)

    // Click outside handler
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
    }, [])

    // Debounced search handler
    const onInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value
            setSearch(value)

            if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
            if (!value) {
                setIsOpen(false)
                return
            }
            debounceTimeout.current = setTimeout(() => {
                fetchFunction(value)
            }, debounceMs)
        },
        [fetchFunction, debounceMs]
    )

    const handleClear = useCallback(() => {
        setSearch("")
        setIsOpen(false)
    }, [])

    return {
        search,
        setSearch,
        isOpen,
        setIsOpen,
        wrapperRef,
        onInput,
        handleClear,
    }
}
