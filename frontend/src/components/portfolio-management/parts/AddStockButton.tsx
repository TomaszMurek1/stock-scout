import React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface AddStockButtonProps {
  onClick: () => void;
}

export default function AddStockButton({ onClick }: AddStockButtonProps) {
  return (
    <Button onClick={onClick} className="bg-primary text-white hover:bg-primary/90">
      <PlusCircle className="mr-2 h-4 w-4" />
      Buy Stock 1
    </Button>
  );
}
