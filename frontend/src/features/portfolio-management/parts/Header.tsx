"use client";

import { FC } from "react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onAdd: () => void;
}

export const Header: FC<HeaderProps> = ({ onAdd }) => {
  return (
    <div className="flex items-start justify-between">
      <div className="space-y-1 text-left">
        <h1 className="text-2xl font-bold leading-tight block text-left" style={{ margin: 0, padding: 0, textAlign: 'left' }}>
          Portfolio management
        </h1>
        <p className="text-sm text-muted-foreground text-left" style={{ margin: 0, padding: 0, textAlign: 'left' }}>
          Track positions, performance and cash flows.
        </p>
      </div>
      <Button onClick={onAdd} className="bg-blue-600 hover:bg-blue-700 text-white">
        Buy instrument
      </Button>
    </div>
  );
};
