"use client";

import { useState, type FC } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePortfolioStore } from "@/store/portfolioStore";
import { toast } from "react-toastify";


interface AddStockModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AddStockModal: FC<AddStockModalProps> = ({ isOpen, onClose }) => {
    const [symbol, setSymbol] = useState("");
    const [shares, setShares] = useState("");
    const [price, setPrice] = useState("");
    const [fee, setFee] = useState("0");
    const [loading, setLoading] = useState(false);

    const buy = usePortfolioStore((s) => s.buy);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!symbol || !shares || !price) return;

        setLoading(true);
        try {
            debugger
            await buy({
                ticker: symbol.toUpperCase(),
                shares: Number(shares),
                price: Number(price),
                fee: Number(fee || 0),
            });
            toast.success("Position added!");
            /* reset + close */
            setSymbol("");
            setShares("");
            setPrice("");
            setFee("0");
            onClose();
        } catch (err: any) {
            toast.error(err?.message ?? "Could not add position");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b p-4">
                    <h2 className="text-lg font-semibold">Buy stock / add position</h2>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onClose}
                        className="text-gray-500"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 p-4">
                    {/* symbol */}
                    <div>
                        <label htmlFor="symbol" className="mb-1 block text-sm font-medium">
                            Stock symbol
                        </label>
                        <input
                            id="symbol"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            placeholder="e.g. AAPL"
                            required
                            className="w-full rounded border p-2"
                        />
                    </div>

                    {/* shares & price */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="shares" className="mb-1 block text-sm font-medium">
                                Shares
                            </label>
                            <input
                                id="shares"
                                type="number"
                                min="0.0001"
                                step="0.0001"
                                value={shares}
                                onChange={(e) => setShares(e.target.value)}
                                required
                                className="w-full rounded border p-2"
                            />
                        </div>

                        <div>
                            <label htmlFor="price" className="mb-1 block text-sm font-medium">
                                Price / share ($)
                            </label>
                            <input
                                id="price"
                                type="number"
                                min="0.0001"
                                step="0.0001"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                required
                                className="w-full rounded border p-2"
                            />
                        </div>
                    </div>

                    {/* optional fee */}
                    <div>
                        <label htmlFor="fee" className="mb-1 block text-sm font-medium">
                            Broker fee (optional)
                        </label>
                        <input
                            id="fee"
                            type="number"
                            min="0"
                            step="0.01"
                            value={fee}
                            onChange={(e) => setFee(e.target.value)}
                            className="w-full rounded border p-2"
                        />
                    </div>

                    {/* actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-primary text-white hover:bg-primary/90"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add position
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddStockModal;
