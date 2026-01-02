import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { AlertType } from "../../types/alert.types";

interface AddAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultTicker?: string;
    onSuccess?: () => void;
}

export default function AddAlertModal({ isOpen, onClose, defaultTicker, onSuccess }: AddAlertModalProps) {
    const [ticker, setTicker] = useState(defaultTicker || "");
    const [type, setType] = useState<AlertType>(AlertType.PRICE_BELOW);
    const [threshold, setThreshold] = useState("");
    const [message, setMessage] = useState("");
    
    const { createAlert, isLoadingAlerts } = useAppStore();

    useEffect(() => {
        if (isOpen && defaultTicker) {
            setTicker(defaultTicker);
        }
    }, [isOpen, defaultTicker]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createAlert({
                ticker,
                alert_type: type,
                threshold_value: (type === AlertType.SMA_50_ABOVE_SMA_200 || type === AlertType.SMA_50_BELOW_SMA_200) ? 0 : parseFloat(threshold),
                message
            });
            onClose();
            if (onSuccess) onSuccess();
            // Reset form
            setThreshold("");
            setMessage("");
        } catch (error) {
            // Handle error (toast or inline)
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-white text-slate-800">
                <DialogHeader>
                    <DialogTitle>Set Price Alert</DialogTitle>
                    <DialogDescription>
                        Get notified when {ticker || "a stock"} hits your target.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="ticker" className="text-right">
                            Ticker
                        </Label>
                        <Input
                            id="ticker"
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value)}
                            className="col-span-3"
                            readOnly={!!defaultTicker} // Read-only if passed from context
                            placeholder="AAPL"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            Condition
                        </Label>
                        <Select
                            value={type}
                            onValueChange={(val) => setType(val as AlertType)}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={AlertType.PRICE_ABOVE}>Price Goes Above</SelectItem>
                                <SelectItem value={AlertType.PRICE_BELOW}>Price Goes Below</SelectItem>
                                <SelectItem value={AlertType.PERCENT_CHANGE_UP}>% Move Up</SelectItem>
                                <SelectItem value={AlertType.PERCENT_CHANGE_DOWN}>% Move Down</SelectItem>
                                <SelectItem value={AlertType.SMA_50_ABOVE_SMA_200}>Golden Cross (SMA 50 {">"} SMA 200)</SelectItem>
                                <SelectItem value={AlertType.SMA_50_BELOW_SMA_200}>Death Cross (SMA 50 {"<"} SMA 200)</SelectItem>
                                <SelectItem value={AlertType.SMA_50_APPROACHING_SMA_200}>SMA 50 Approaching SMA 200 (within %)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Hide value input for cross alerts where threshold isn't needed, or repurpose it */}
                    {(type !== AlertType.SMA_50_ABOVE_SMA_200 && type !== AlertType.SMA_50_BELOW_SMA_200) && (
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="threshold" className="text-right">
                            {type === AlertType.SMA_50_APPROACHING_SMA_200 ? "Within %" : "Value"}
                        </Label>
                        <Input
                            id="threshold"
                            type="number"
                            step="0.01"
                            value={threshold}
                            onChange={(e) => setThreshold(e.target.value)}
                            className="col-span-3"
                            placeholder={type === AlertType.SMA_50_APPROACHING_SMA_200 ? "e.g. 5 (for 5%)" : "e.g. 150.00"}
                            required
                        />
                    </div>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="message" className="text-right">
                            Note
                        </Label>
                        <Input
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="col-span-3"
                            placeholder="Optional message"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoadingAlerts}>
                            {isLoadingAlerts ? "Creating..." : "Set Alert"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
