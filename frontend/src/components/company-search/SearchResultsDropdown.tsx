import { Loader2 } from "lucide-react"
import { SearchResultItem } from "./SearchResultItem"
import { Company } from "./types"

export function SearchResultsDropdown({
    results,
    onSelect,
    onSearchMore,
    showSearchMore = false,
    loadingMore = false,
    emptyMessage,
}: {
    results: Company[]
    onSelect: (company: Company) => void
    onSearchMore?: () => void
    showSearchMore?: boolean
    loadingMore?: boolean
    emptyMessage?: string
}) {
    const hasResults = results.length > 0
    return (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-72 overflow-hidden">
            {hasResults ? (
                <div className="overflow-y-auto max-h-64 divide-y divide-gray-100">
                    {results.map((company) => (
                        <SearchResultItem
                            key={company.company_id ?? company.ticker}
                            company={company}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            ) : (
                <div className="px-4 py-3 text-sm text-gray-500 border-b border-gray-200">
                    {emptyMessage || "No companies found"}
                </div>
            )}
            {showSearchMore && (
                <button
                    type="button"
                    className="w-full px-4 py-3 text-sm font-medium text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border-t border-gray-200 flex items-center justify-center transition-colors"
                    onClick={onSearchMore}
                    disabled={loadingMore}
                >
                    {loadingMore ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Searching more results...
                        </>
                    ) : (
                        "Search more"
                    )}
                </button>
            )}
        </div>
    )
}
