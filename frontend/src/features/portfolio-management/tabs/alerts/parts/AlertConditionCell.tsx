import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { AlertType, AUTO_SMA_TYPES } from "@/features/portfolio-management/types/alert.types";
import { AlertRow, formatType } from "./AlertUtils";
import { useTranslation } from "react-i18next";

interface AlertConditionCellProps {
    row: AlertRow;
}

export const AlertConditionCell: React.FC<AlertConditionCellProps> = ({ row }) => {
    const { t } = useTranslation();
    const isAuto = AUTO_SMA_TYPES.has(row.alert_type);
    const isAbove = row.alert_type === AlertType.PRICE_ABOVE
        || row.alert_type === AlertType.SMA_50_CROSS_ABOVE
        || row.alert_type === AlertType.SMA_200_CROSS_ABOVE;
    const isBelow = row.alert_type === AlertType.PRICE_BELOW
        || row.alert_type === AlertType.SMA_50_CROSS_BELOW
        || row.alert_type === AlertType.SMA_200_CROSS_BELOW;

    return (
        <div className="flex flex-col items-center justify-center">
            <div className={`flex items-center text-sm font-medium ${
                isAbove ? 'text-green-600' :
                isBelow ? 'text-red-600' : 'text-gray-700'
            }`}>
                {isAbove ? <ArrowUp className="mr-1 h-3 w-3" /> :
                    isBelow ? <ArrowDown className="mr-1 h-3 w-3" /> : null}
                {formatType(row.alert_type, t)}
            </div>

            {isAuto && (
                <span style={{
                    display: "inline-block",
                    marginTop: 2,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "#dbeafe",
                    color: "#2563eb",
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                }}>AUTO</span>
            )}

            {(row.alert_type === AlertType.SMA_50_APPROACHING_SMA_200) ? (
                <span className="text-xs text-gray-500 font-medium">{t("portfolio.alerts.within")} {row.threshold_value}%</span>
            ) : (
                (row.alert_type !== AlertType.SMA_50_ABOVE_SMA_200 &&
                row.alert_type !== AlertType.SMA_50_BELOW_SMA_200 &&
                !isAuto) && (
                    <span className="font-bold text-gray-900">{row.threshold_value}</span>
                )
            )}
        </div>
    );
};
