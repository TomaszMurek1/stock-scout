import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import { CheckCircle, Clock, Trash2 } from "lucide-react";
import { AlertRow } from "./AlertUtils";
import { useTranslation } from "react-i18next";

interface AlertRowActionsProps {
    row: AlertRow;
    onMarkAsRead: (id: number) => void;
    onToggleSnooze: (id: number, currentSnooze: string | null) => void;
    onDelete: (id: number) => void;
}

export const AlertRowActions: React.FC<AlertRowActionsProps> = ({ 
    row, 
    onMarkAsRead, 
    onToggleSnooze, 
    onDelete 
}) => {
    const { t } = useTranslation();
    return (
        <div className="flex items-center gap-1">
            {row.state !== 'read' && (
                <Tooltip title={t("alerts.mark_read")}>
                    <IconButton size="small" onClick={() => onMarkAsRead(row.id)}>
                        <CheckCircle className="h-4 w-4 text-gray-400 hover:text-green-600" />
                    </IconButton>
                </Tooltip>
            )}
            <Tooltip title={row.snoozed_until ? t("alerts.unsnooze") : t("alerts.snooze_24h")}>
                <IconButton size="small" onClick={() => onToggleSnooze(row.id, row.snoozed_until)}>
                    <Clock className={`h-4 w-4 ${row.snoozed_until ? "text-amber-500" : "text-gray-400 hover:text-amber-600"}`} />
                </IconButton>
            </Tooltip>
            <Tooltip title={t("alerts.delete")}>
                <IconButton size="small" onClick={() => onDelete(row.id)}>
                    <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                </IconButton>
            </Tooltip>
        </div>
    );
};
