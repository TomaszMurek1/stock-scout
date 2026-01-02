import React from "react";
import { AlertRow, formatDate } from "./AlertUtils";

interface AlertInfoCellProps {
    row: AlertRow;
    isTriggered: boolean;
}

export const AlertInfoCell: React.FC<AlertInfoCellProps> = ({ row, isTriggered }) => {
    const isSnoozed = row.snoozed_until && new Date(row.snoozed_until) > new Date();
    
    return (
        <div className="flex flex-col text-left">
            <div className="flex flex-wrap gap-1 mb-1">
                {isTriggered && <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Condition Met</span>}
                {row.is_read && <span className="text-[10px] bg-gray-50 text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Read</span>}
                {isSnoozed && <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Snoozed</span>}
                {!isTriggered && !row.is_read && !isSnoozed && <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Pending</span>}
            </div>
            
            {row.message ? (
                <span className="text-sm text-gray-600 italic truncate max-w-xs" title={row.message}>"{row.message}"</span>
            ) : (
                <span className="text-xs text-gray-400">No note</span>
            )}
            <span className="text-[10px] text-gray-400 mt-0.5">
                    {row.snoozed_until ? `Snoozed until ${formatDate(row.snoozed_until)}` : `Created ${formatDate(row.created_at)}`}
            </span>
        </div>
    );
};
