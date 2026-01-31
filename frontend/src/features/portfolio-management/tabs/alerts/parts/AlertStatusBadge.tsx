import React from "react";
import { Zap, Clock, CheckCircle, Bell } from "lucide-react";
import { AlertRow } from "./AlertUtils";
import { useTranslation } from "react-i18next";

interface AlertStatusBadgeProps {
    state: AlertRow["state"];
}

export const AlertStatusBadge: React.FC<AlertStatusBadgeProps> = ({ state }) => {
    const { t } = useTranslation();
    let icon, colorClass, label;
    
    switch(state) {
        case 'triggered':
            icon = <Zap className="h-3 w-3 fill-current" />;
            colorClass = 'bg-red-100 text-red-700 border-red-200';
            label = t("portfolio.alerts.triggered");
            break;
        case 'snoozed':
            icon = <Clock className="h-3 w-3" />;
            colorClass = 'bg-amber-100 text-amber-700 border-amber-200';
            label = t("portfolio.alerts.snoozed");
            break;
        case 'read':
            icon = <CheckCircle className="h-3 w-3" />;
            colorClass = 'bg-gray-100 text-gray-500 border-gray-200';
            label = t("portfolio.alerts.read");
            break;
        case 'pending':
        default:
            icon = <Bell className="h-3 w-3" />;
            colorClass = 'bg-blue-100 text-blue-700 border-blue-200';
            label = t("portfolio.alerts.pending");
            break;
    }

    return (
        <div className={`flex items-center space-x-1.5 px-2 py-1 rounded-full border text-[10px] font-bold uppercase tracking-tight mx-auto w-fit ${colorClass}`}>
            {icon}
            <span>{label}</span>
        </div>
    );
};
