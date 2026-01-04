"use client"

import { useMemo, useEffect, useState } from "react"
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table"
import { useNavigate } from "react-router-dom"
import { Bell } from "lucide-react"
import { useAppStore } from "@/store/appStore"
import { AlertType, Alert } from "@/features/portfolio-management/types/alert.types"
import { useShallow } from "zustand/react/shallow"

// Sub-components and Utils
import { AlertRow } from "./parts/AlertUtils"
import { AlertStatusBadge } from "./parts/AlertStatusBadge"
import { AlertAssetCell } from "./parts/AlertAssetCell"
import { AlertValueCell } from "./parts/AlertValueCell"
import { AlertConditionCell } from "./parts/AlertConditionCell"
import { AlertInfoCell } from "./parts/AlertInfoCell"
import { AlertRowActions } from "./parts/AlertRowActions"

export default function AlertsTab() {
    const { alerts, isLoadingAlerts, updateAlert, deleteAlert, clearAllAlerts } = useAppStore(
        useShallow((state) => ({
            alerts: state.alerts,
            isLoadingAlerts: state.isLoadingAlerts,
            updateAlert: state.updateAlert,
            deleteAlert: state.deleteAlert,
            clearAllAlerts: state.clearAllAlerts,
        }))
    );
    
    const navigate = useNavigate();
    const portfolioHoldings = useAppStore(useShallow((state) => state.holdings));
    const watchlist = useAppStore(useShallow((state) => state.watchlist.data || []));

    // State to lookup names and prices
    const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
    const [companyNames, setCompanyNames] = useState<Record<string, string>>({});
    const [smas, setSmas] = useState<Record<string, { sma50?: number, sma200?: number }>>({});
    const [triggeredAlerts, setTriggeredAlerts] = useState<Record<number, boolean>>({});

    useEffect(() => {
        const prices: Record<string, number> = {};
        const names: Record<string, string> = {};
        const newSmas: Record<string, { sma50?: number, sma200?: number }> = {};
        
        portfolioHoldings.forEach((h) => {
             if (h.last_price) prices[h.ticker] = h.last_price; 
             if (h.name) names[h.ticker] = h.name;
             if (h.sma_50 || h.sma_200) {
                 newSmas[h.ticker] = { sma50: h.sma_50, sma200: h.sma_200 };
             }
        });

        watchlist.forEach((w) => {
            if (w.market_data?.last_price) {
                prices[w.ticker] = w.market_data.last_price;
            }
            if (w.name) names[w.ticker] = w.name;
            if (w.market_data?.sma_50 || w.market_data?.sma_200) {
                 newSmas[w.ticker] = { 
                     ...newSmas[w.ticker],
                     sma50: w.market_data.sma_50 || newSmas[w.ticker]?.sma50,
                     sma200: w.market_data.sma_200 || newSmas[w.ticker]?.sma200
                 };
            }
        });

        setCurrentPrices(prices);
        setCompanyNames(names);
        setSmas(newSmas);

        // Calculate triggered state
        const newTriggered: Record<number, boolean> = {};
        alerts.forEach(alert => {
             const price = prices[alert.ticker];
             const smaData = newSmas[alert.ticker];
             
             if (price !== undefined) {
                 let isTriggered = false;
                 switch (alert.alert_type) {
                     case AlertType.PRICE_ABOVE:
                         isTriggered = price > alert.threshold_value;
                         break;
                     case AlertType.PRICE_BELOW:
                         isTriggered = price < alert.threshold_value;
                         break;
                     case AlertType.SMA_50_ABOVE_SMA_200:
                         if (smaData?.sma50 && smaData?.sma200) {
                             isTriggered = smaData.sma50 > smaData.sma200;
                         }
                         break;
                     case AlertType.SMA_50_BELOW_SMA_200:
                         if (smaData?.sma50 && smaData?.sma200) {
                             isTriggered = smaData.sma50 < smaData.sma200;
                         }
                         break;
                     case AlertType.SMA_50_APPROACHING_SMA_200:
                         if (smaData?.sma50 && smaData?.sma200) {
                             const diff = Math.abs(smaData.sma50 - smaData.sma200);
                             const percentDiff = (diff / smaData.sma200) * 100;
                             isTriggered = percentDiff <= Number(alert.threshold_value);
                         }
                         break;
                 }
                 newTriggered[alert.id] = isTriggered;
             }
        });
        setTriggeredAlerts(newTriggered);

    }, [alerts, portfolioHoldings, watchlist]);

    const getAlertState = (alert: Alert): AlertRow['state'] => {
        const isSnoozed = alert.snoozed_until && new Date(alert.snoozed_until) > new Date();
        if (isSnoozed) return "snoozed";
        if (alert.is_read) return "read";
        const isLiveTriggered = triggeredAlerts[alert.id];
        if (isLiveTriggered) return "triggered";
        return "pending";
    }

    const tableData = useMemo<AlertRow[]>(() => {
        return alerts.map(alert => ({
            ...alert,
            currentPrice: currentPrices[alert.ticker],
            currentSma: smas[alert.ticker],
            companyName: companyNames[alert.ticker] || alert.ticker,
            state: getAlertState(alert)
        }));
    }, [alerts, currentPrices, companyNames, triggeredAlerts, smas]);

    const columns = useMemo<MRT_ColumnDef<AlertRow>[]>(
        () => [
            {
                accessorKey: 'state',
                header: 'Status',
                size: 100,
                Cell: ({ cell }) => <AlertStatusBadge state={cell.getValue<AlertRow['state']>()} />,
                muiTableHeadCellProps: { align: 'center' },
                muiTableBodyCellProps: { align: 'center' },
            },
            {
                accessorKey: 'companyName',
                header: 'Asset',
                size: 200,
                Cell: ({ row }) => <AlertAssetCell row={row.original} onNavigate={(ticker) => navigate(`/stock-details/${ticker}`)} />,
            },
            {
                accessorKey: 'currentPrice',
                header: 'Current Value', 
                size: 160,
                Cell: ({ row }) => <AlertValueCell row={row.original} />,
                muiTableHeadCellProps: { align: 'right' },
                muiTableBodyCellProps: { align: 'right' },
            },
            {
                accessorKey: 'threshold_value',
                header: 'Condition',
                size: 180,
                Cell: ({ row }) => <AlertConditionCell row={row.original} />,
                muiTableHeadCellProps: { align: 'center' },
                muiTableBodyCellProps: { align: 'center' },
            },
            {
                id: 'info',
                header: 'Info',
                size: 250,
                Cell: ({ row }) => <AlertInfoCell row={row.original} isTriggered={triggeredAlerts[row.original.id]} />,
            }
        ],
        [navigate, triggeredAlerts]
    );

    return (
        <div className="shadow-sm rounded-lg overflow-hidden border border-gray-200 bg-white">
            <MaterialReactTable
                columns={columns}
                data={tableData}
                state={{ isLoading: isLoadingAlerts }}
                enableTopToolbar={true}
                enableColumnActions={false}
                enableColumnFilters={false}
                enablePagination={true}
                enableSorting={true}
                enableRowActions={true}
                positionActionsColumn="last"
                
                renderTopToolbarCustomActions={() => (
                     <div className="flex items-center p-2">
                        <div className="flex items-center mr-4">
                            <Bell className="mr-2 h-5 w-5 text-primary" />
                            <h2 className="text-xl font-semibold text-gray-800">Alerts & Notifications</h2>
                        </div>
                        {alerts.length > 0 && (
                            <button 
                                onClick={clearAllAlerts}
                                className="text-sm text-gray-500 hover:text-red-600 underline"
                            >
                                Clear All
                            </button>
                        )}
                     </div>
                )}

                renderRowActions={({ row }) => (
                    <AlertRowActions 
                        row={row.original} 
                        onMarkAsRead={(id) => updateAlert(id, { is_read: true })}
                        onToggleSnooze={(id, current) => {
                            const snooze = current ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                            updateAlert(id, { snoozed_until: snooze });
                        }}
                        onDelete={(id) => deleteAlert(id)}
                    />
                )}

                muiTopToolbarProps={{ sx: { backgroundColor: "#e5e7eb", paddingY: 1, paddingX: 2 } }}
                muiTableHeadCellProps={{ sx: { backgroundColor: "#e5e7eb" } }}
                muiBottomToolbarProps={{ sx: { backgroundColor: "#e5e7eb" } }}

                muiTableBodyRowProps={({ row }) => {
                    let bg = '#fff';
                    let borderLeft = '4px solid transparent';
                    const state = row.original.state;
                    
                    if (state === 'triggered') { bg = '#fef2f2'; borderLeft = '4px solid #ef4444'; }
                    else if (state === 'snoozed') { bg = '#f9fafb'; }
                    else if (state === 'pending') { bg = '#eff6ff'; borderLeft = '4px solid #60a5fa'; }

                    return {
                        sx: {
                            backgroundColor: bg,
                            borderLeft: borderLeft,
                            opacity: state === 'snoozed' ? 0.7 : 1,
                            '&:hover': {
                                backgroundColor: state === 'triggered' ? '#fee2e2' : '#f3f4f6'
                            }
                        }
                    }
                }}
            />
        </div>
    )
}
