export function NoResultsDropdown({ search }: { search: string }) {
    return (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-md shadow-lg z-50 p-3 text-center animate-in slide-in-from-top-2 duration-200">
            <p className="text-sm text-gray-500">No companies found for "{search}"</p>
        </div>
    )
}