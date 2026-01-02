import React from "react";
import { AlertType } from "@/features/portfolio-management/types/alert.types";
import { AlertRow } from "./AlertUtils";

interface AlertValueCellProps {
    row: AlertRow;
}

export const AlertValueCell: React.FC<AlertValueCellProps> = ({ row }) => {
    const type = row.alert_type;
    const isSmaAlert = type.startsWith('SMA');
    
    if (isSmaAlert) {
        const sma = row.currentSma;
        if (!sma) return <span className="text-gray-400">Loading...</span>;
        
        let diffElem = null;
        if (type === AlertType.SMA_50_APPROACHING_SMA_200 && sma.sma50 && sma.sma200) {
            const diff = Math.abs(sma.sma50 - sma.sma200);
            const percentDiff = (diff / sma.sma200) * 100;
            diffElem = <span className="text-[10px] text-gray-500 font-medium mt-0.5">Diff: {percentDiff.toFixed(2)}%</span>;
        }

        return (
            <div className="flex flex-col text-xs font-mono">
                <span className="text-blue-600 font-bold">SMA50: {sma.sma50?.toFixed(2) ?? 'N/A'}</span>
                <span className="text-purple-600 font-bold">SMA200: {sma.sma200?.toFixed(2) ?? 'N/A'}</span>
                {diffElem}
            </div>
        )
    }
    
    return (
        <span className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
            {row.currentPrice?.toFixed(2) || "..."}
        </span>
    );
};
