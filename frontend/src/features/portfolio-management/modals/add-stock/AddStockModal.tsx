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
}

const AddStockModal: FC<AddStockModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialTicker,
  initialName,
  initialCurrency,
  initialPrice 
}) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Start fresh to show loader if re-opening (though usually component unmounts?)
      // We set it to true after a tiny delay to allow main thread to paint the Modal Shell first
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 50); // 50ms delay
      return () => clearTimeout(timer);
    } else {
      // When closing, wait for animation to finish before resetting state
      const timer = setTimeout(() => {
        setIsReady(false);
      }, 300); // 300ms match Dialog exit animation
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px] bg-slate-50 p-0 overflow-hidden border-none shadow-2xl rounded-xl [&>button]:text-white [&>button]:hover:text-white/80">
        <DialogHeader className="from-blue-800 to-blue-900 bg-gradient-to-br border-b-4 border-blue-400 px-6 py-4 relative">
          <DialogTitle className="text-white text-xl font-bold flex items-center gap-2">
            Add Position
          </DialogTitle>
          <DialogDescription className="text-blue-100/70 text-xs text-left font-medium">
            Enter the details of your stock purchase manually.
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
          />
        ) : (
          <div className="flex h-[500px] items-center justify-center">
             <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddStockModal;
