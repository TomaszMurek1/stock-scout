import React from "react";
import { Tooltip } from "@mui/material";
import { AlertRow } from "./AlertUtils";

interface AlertAssetCellProps {
    row: AlertRow;
    onNavigate: (ticker: string) => void;
}

export const AlertAssetCell: React.FC<AlertAssetCellProps> = ({ row, onNavigate }) => {
    return (
        <Tooltip title={`Ticker: ${row.ticker}`}>
            <div 
                className="flex flex-col cursor-pointer hover:underline text-left"
                onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(row.ticker);
                }}
            >
                 <span className="font-bold text-gray-900 block truncate cursor-pointer text-primary">
                    {row.companyName}
                 </span>
                 <span className="text-[10px] text-gray-400 font-mono">
                    {row.ticker}
                 </span>
            </div>
        </Tooltip>
    );
};
