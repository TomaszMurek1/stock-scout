import { FC, ReactNode } from "react";
import { Card } from "@/components/ui/Layout";

interface RefreshedCardProps {
  children: ReactNode;
  className?: string;
  isRefreshed?: boolean;
}

export const RefreshedCard: FC<RefreshedCardProps> = ({ 
  children, 
  className = "", 
  isRefreshed = false 
}) => {
  return (
    <Card className={`transition-all duration-1000 ${
        isRefreshed 
          ? "bg-emerald-50 shadow-lg border-emerald-200 ring-1 ring-emerald-300" 
          : "bg-white"
      } ${className}`}>
      {children}
    </Card>
  );
};

interface RefreshedHeaderProps {
    children: ReactNode;
    className?: string;
    isRefreshed?: boolean;
}

export const RefreshedHeader: FC<RefreshedHeaderProps> = ({
    children,
    className = "",
    isRefreshed = false
}) => {
    return (
        <div className={`transition-colors duration-1000 ${
            isRefreshed ? "bg-emerald-50/50" : "bg-white"
        } ${className}`}>
            {children}
        </div>
    );
}

// Also useful for the content wrapper if it needs background coloring
export const RefreshedContent: FC<RefreshedHeaderProps> = ({
    children,
    className = "",
    isRefreshed = false
}) => {
    return (
        <div className={`transition-colors duration-1000 ${
            isRefreshed ? "bg-emerald-50/30" : "bg-white"
        } ${className}`}>
            {children}
        </div>
    );
}
