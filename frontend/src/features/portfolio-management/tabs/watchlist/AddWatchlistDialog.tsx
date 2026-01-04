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
import { apiClient } from "@/services/apiClient"
import { AppState, useAppStore } from "@/store/appStore"
import { Company } from "@/features/company-search/types"
import { CompanySearch } from "@/features/company-search/CompanySearch"
import { useTranslation } from "react-i18next"

export function AddWatchlistDialog() {
    const [open, setOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const refreshWatchlist = useAppStore((state: AppState) => state.refreshWatchlist)
    const { t } = useTranslation()

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
                    {t("common.add_stock")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t("watchlist.add_dialog_title")}</DialogTitle>
                    <DialogDescription>
                        {t("watchlist.add_dialog_desc")}
                    </DialogDescription>
                </DialogHeader>
                {error && (
                    <p className="text-sm text-red-600">{error}</p>
                )}
                <CompanySearch
                    actionLabel={t("watchlist.add_action")}
                    actionLoading={submitting}
                    onAction={handleAdd}
                    containerClassName="mx-0 px-0 py-0"
                    contentClassName="bg-transparent shadow-none p-0"
                />
            </DialogContent>
        </Dialog>
    )
}
