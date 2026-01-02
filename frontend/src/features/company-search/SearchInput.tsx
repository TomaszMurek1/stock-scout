import { MarketBadge } from "./MarketBadge"
import { Company } from "./types"
import { BaseSearchInput } from "@/components/shared/BaseSearchInput"
import { Search } from "lucide-react"


export function SearchInput({
    search,
    onInput,
    selected,
    onClear,
    loading,
    placeholder,
    primaryMarket,
}: {
    search: string
    onInput: (e: React.ChangeEvent<HTMLInputElement>) => void
    selected: Company | null
    onClear: () => void
    loading: boolean
    placeholder: string
    primaryMarket?: string
}) {
    // Custom left icon - either market badge or search icon
    const leftIcon = selected && primaryMarket ? (
        <MarketBadge marketName={primaryMarket} />
    ) : (
        <Search className="h-5 w-5 text-gray-400 group-focus-within:text-gray-600" />
    )

    return (
        <div className="relative group w-full">
            <BaseSearchInput
                search={search}
                onInput={onInput}
                onClear={onClear}
                loading={loading}
                placeholder={placeholder}
                className="pl-12 pr-16 bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-200 hover:bg-white focus:bg-white"
                leftIcon={leftIcon}
                showClearButton={!!selected}
            />
        </div>
    )
}