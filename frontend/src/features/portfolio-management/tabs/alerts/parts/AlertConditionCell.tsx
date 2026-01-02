import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { AlertType } from "@/features/portfolio-management/types/alert.types";
import { AlertRow, formatType } from "./AlertUtils";

interface AlertConditionCellProps {
    row: AlertRow;
}

export const AlertConditionCell: React.FC<AlertConditionCellProps> = ({ row }) => {
    return (
        <div className="flex flex-col items-center justify-center">
            <div className={`flex items-center text-sm font-medium ${
                row.alert_type === AlertType.PRICE_ABOVE ? 'text-green-600' : 
                row.alert_type === AlertType.PRICE_BELOW ? 'text-red-600' : 'text-gray-700'
            }`}>
                {row.alert_type === AlertType.PRICE_ABOVE ? <ArrowUp className="mr-1 h-3 w-3" /> : 
                    row.alert_type === AlertType.PRICE_BELOW ? <ArrowDown className="mr-1 h-3 w-3" /> : null}
                {formatType(row.alert_type)}
            </div>
            
            {(row.alert_type === AlertType.SMA_50_APPROACHING_SMA_200) ? (
                <span className="text-xs text-gray-500 font-medium">within {row.threshold_value}%</span>
            ) : (
                (row.alert_type !== AlertType.SMA_50_ABOVE_SMA_200 && 
                row.alert_type !== AlertType.SMA_50_BELOW_SMA_200) && (
                    <span className="font-bold text-gray-900">{row.threshold_value}</span>
                )
            )}
        </div>
    );
};
