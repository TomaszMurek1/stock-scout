import { SearchResultItem } from "./SearchResultItem"
import { Company } from "./types"

export function SearchResultsDropdown({
    results,
    onSelect,
}: {
    results: Company[]
    onSelect: (company: Company) => void
}) {
    return (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-64 overflow-hidden">
            <div className="overflow-y-auto max-h-64 divide-y divide-gray-100">
                {results.map((company) => (
                    <SearchResultItem key={company.company_id} company={company} onSelect={onSelect} />
                ))}
            </div>
        </div>
    )
}