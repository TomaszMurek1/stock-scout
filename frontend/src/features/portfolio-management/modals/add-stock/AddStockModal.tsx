"use client";

import { FC, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddStockForm } from "./AddStockForm";

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialTicker?: string;
  initialName?: string;
  initialCurrency?: string;
  initialPrice?: number;
  initialType?: "buy" | "sell";
}

const AddStockModal: FC<AddStockModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialTicker,
  initialName,
  initialCurrency,
  initialPrice,
  initialType = "buy"
}) => {
  const [isReady, setIsReady] = useState(false);
  const [currentType, setCurrentType] = useState<"buy" | "sell">(initialType);

  useEffect(() => {
    if (isOpen) {
      setCurrentType(initialType);
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 50); 
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setIsReady(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialType]);

  const isBuy = currentType === "buy";
  const headerGradient = isBuy ? "from-teal-600 to-teal-700 border-teal-500" : "from-blue-700 to-blue-800 border-blue-500";
  const titleText = isBuy ? "Add Position (Buy)" : "Reduce Position (Sell)";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px] bg-slate-50 p-0 overflow-hidden border-none shadow-2xl rounded-xl [&>button.absolute]:hidden">
        <DialogHeader className={`${headerGradient} bg-gradient-to-br border-b-4 px-6 py-4 relative transition-colors duration-300`}>
          <DialogTitle className="text-white text-xl font-bold flex items-center gap-2">
            {titleText}
          </DialogTitle>
          <DialogDescription className="text-white/70 text-xs text-left font-medium">
            {isBuy ? "Enter details to purchase stock." : "Enter details to sell stock from your portfolio."}
          </DialogDescription>
        </DialogHeader>

        {isReady ? (
          <AddStockForm 
            onClose={onClose}
            onSuccess={onSuccess}
            isOpen={isOpen}
            initialTicker={initialTicker}
            initialName={initialName}
            initialCurrency={initialCurrency}
            initialPrice={initialPrice}
            initialType={initialType}
            onTypeChange={setCurrentType}
          />
        ) : (
          <div className="flex h-[500px] items-center justify-center">
             <Loader2 className={`h-8 w-8 animate-spin ${isBuy ? "text-teal-600" : "text-blue-600"}`} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddStockModal;
