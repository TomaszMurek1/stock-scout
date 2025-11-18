"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { CompanySearch } from "@/components/company-search/CompanySearch"
import { Company } from "@/components/company-search/types"
import { apiClient } from "@/services/apiClient"
import { AppState, useAppStore } from "@/store/appStore"

export function AddWatchlistDialog() {
    const [open, setOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const refreshWatchlist = useAppStore((state: AppState) => state.refreshWatchlist)

    const handleAdd = async (company: Company) => {
        setError(null)
        setSubmitting(true)
        try {
            await apiClient.post("/watchlist", { ticker: company.ticker })
            await refreshWatchlist()
            setOpen(false)
        } catch (err) {
            const message =
                (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ??
                "Failed to add stock to watchlist"
            setError(message)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDialogChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setError(null)
        }
        setOpen(nextOpen)
    }

    return (
        <Dialog open={open} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-gray-600">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Stock
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add stock to watchlist</DialogTitle>
                    <DialogDescription>
                        Search for a company and add it to your favorites list.
                    </DialogDescription>
                </DialogHeader>
                {error && (
                    <p className="text-sm text-red-600">{error}</p>
                )}
                <CompanySearch
                    actionLabel="Add to Watchlist"
                    actionLoading={submitting}
                    onAction={handleAdd}
                    containerClassName="mx-0 px-0 py-0"
                    contentClassName="bg-transparent shadow-none p-0"
                />
            </DialogContent>
        </Dialog>
    )
}
