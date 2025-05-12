"use client";

import { FC, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { usePortfolioStore } from "@/store/portfolioStore";
import { toast } from "react-toastify";

interface AddStockModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface FormValues {
    symbol: string;
    shares: number;
    price: number;
    fee: number;
    currency: string;
    currency_rate: number;
}

const AddStockModal: FC<AddStockModalProps> = ({ isOpen, onClose }) => {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        defaultValues: {
            fee: 0,
            currency: "",
            currency_rate: 1,
        },
    });
    const [loading, setLoading] = useState(false);
    const buy = usePortfolioStore((state) => state.buy);

    if (!isOpen) return null;

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        setLoading(true);
        try {
            debugger
            await buy({
                ticker: data.symbol.toUpperCase(),
                shares: data.shares,
                price: data.price,
                fee: data.fee,
                currency: data.currency,
                currency_rate: data.currency_rate,
            });
            toast.success("Position added!");
            reset();
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
                    <Button size="icon" variant="ghost" onClick={onClose} className="text-gray-500">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-4">
                    {/* symbol */}
                    <div>
                        <label htmlFor="symbol" className="mb-1 block text-sm font-medium">
                            Stock symbol
                        </label>
                        <input
                            id="symbol"
                            type="text"
                            placeholder="e.g. AAPL"
                            {...register("symbol", { required: true })}
                            className="w-full rounded border p-2"
                        />
                        {errors.symbol && <p className="text-red-500 text-sm mt-1">Symbol is required</p>}
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
                                step="0.0001"
                                min="0.0001"
                                {...register("shares", { required: true, valueAsNumber: true, min: 0.0001 })}
                                className="w-full rounded border p-2"
                            />
                            {errors.shares && <p className="text-red-500 text-sm mt-1">Invalid shares</p>}
                        </div>

                        <div>
                            <label htmlFor="price" className="mb-1 block text-sm font-medium">
                                Price / share ($)
                            </label>
                            <input
                                id="price"
                                type="number"
                                step="0.0001"
                                min="0.0001"
                                {...register("price", { required: true, valueAsNumber: true, min: 0.0001 })}
                                className="w-full rounded border p-2"
                            />
                            {errors.price && <p className="text-red-500 text-sm mt-1">Invalid price</p>}
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
                            step="0.01"
                            min="0"
                            {...register("fee", { valueAsNumber: true, min: 0 })}
                            className="w-full rounded border p-2"
                        />
                        {errors.fee && <p className="text-red-500 text-sm mt-1">Invalid fee</p>}
                    </div>

                    {/* currency */}
                    <div>
                        <label htmlFor="currency" className="mb-1 block text-sm font-medium">
                            Currency
                        </label>
                        <input
                            id="currency"
                            type="text"
                            placeholder="e.g. USD"
                            {...register("currency", { required: true })}
                            className="w-full rounded border p-2"
                        />
                        {errors.currency && <p className="text-red-500 text-sm mt-1">Currency is required</p>}
                    </div>

                    {/* currency rate */}
                    <div>
                        <label htmlFor="currency_rate" className="mb-1 block text-sm font-medium">
                            Currency rate (to USD)
                        </label>
                        <input
                            id="currency_rate"
                            type="number"
                            step="0.0001"
                            min="0"
                            {...register("currency_rate", { required: true, valueAsNumber: true, min: 0 })}
                            className="w-full rounded border p-2"
                        />
                        {errors.currency_rate && <p className="text-red-500 text-sm mt-1">Invalid rate</p>}
                    </div>

                    {/* actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || loading}
                            className="bg-primary text-white hover:bg-primary/90"
                        >
                            {(loading || isSubmitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add position
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddStockModal;
