import { Search, Loader2, X } from "lucide-react"
import { MarketBadge } from "./MarketBadge"
import { Input } from "@/components/ui/input"
import { Company } from "./types"


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
    // Always render left icon/space for perfect alignment
    return (
        <div className="relative group w-full">
            {/* Always occupies same space */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center z-10">
                {selected && primaryMarket ? (
                    <MarketBadge marketName={primaryMarket} />
                ) : (
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-gray-600" />
                )}
            </div>

            <Input
                type="text"
                placeholder={placeholder}
                value={search}
                onChange={onInput}
                className="pl-12 pr-16 h-10 text-sm border border-gray-300 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 bg-white/80 backdrop-blur-sm shadow-sm rounded-md transition-all duration-200 hover:bg-white focus:bg-white"
                autoComplete="off"
                spellCheck={false}
            />

            {selected && (
                <button
                    onClick={onClear}
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                    aria-label="Clear search"
                >
                    <X className="h-4 w-4" />
                </button>
            )}

            {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                </div>
            )}
        </div>

    )
}