"use client";

import { FC } from "react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onAdd: () => void;
}

export const Header: FC<HeaderProps> = ({ onAdd }) => {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Portfolio management</h1>
        <p className="text-sm text-muted-foreground">
          Track positions, performance and cash flows.
        </p>
      </div>
      <Button onClick={onAdd}>Buy stock</Button>
    </div>
  );
};
