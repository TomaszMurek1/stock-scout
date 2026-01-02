"use client"

import { useMemo, useEffect, useState } from "react"
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table"
import { IconButton, Tooltip } from "@mui/material"
import { useNavigate } from "react-router-dom"
import { Bell, CheckCircle, Clock, Trash2, Zap, ArrowUp, ArrowDown } from "lucide-react"
import { useAppStore } from "@/store/appStore"
import { AlertType, Alert } from "@/features/portfolio-management/types/alert.types"
import { useShallow } from "zustand/react/shallow"

// Extended type for table display
interface AlertRow extends Alert {
    currentPrice?: number
    companyName: string
    state: "triggered" | "snoozed" | "read" | "pending"
}

// Helper functions moved outside component
const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString)
    return (
        date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
        " at " +
        date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    )
}

const formatType = (type: AlertType) => {
    switch (type) {
        case AlertType.PRICE_ABOVE: return "Price Above";
        case AlertType.PRICE_BELOW: return "Price Below";
        case AlertType.PERCENT_CHANGE_UP: return "% Move Up";
        case AlertType.PERCENT_CHANGE_DOWN: return "% Move Down";
        case AlertType.SMA_50_ABOVE_SMA_200: return "Golden Cross";
        case AlertType.SMA_50_BELOW_SMA_200: return "Death Cross";
        case AlertType.SMA_50_APPROACHING_SMA_200: return "Approaching";
        default: return type;
    }
}

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
    const portfolioHoldings = useAppStore(useShallow((state) => state.portfolio.data?.holdings || []));
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
        
        // Gather from holdings (portfolioHoldings should be typed, but using any for safety)
        portfolioHoldings.forEach((h: any) => {
             if (h.last_price) prices[h.ticker] = h.last_price; 
             if (h.name) names[h.ticker] = h.name;
             if (h.sma_50 || h.sma_200) {
                 newSmas[h.ticker] = { sma50: h.sma_50, sma200: h.sma_200 };
             }
        });

        // Gather from watchlist (watchlist items "w" should be typed)
        watchlist.forEach((w: any) => {
            if (w.market_data?.last_price) {
                prices[w.ticker] = w.market_data.last_price;
            }
            if (w.name) names[w.ticker] = w.name;
            if (w.market_data?.sma_50 || w.market_data?.sma_200) {
                 newSmas[w.ticker] = { 
                     // Prioritize existing if from holdings, but usually one source
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
             const smaData = smas[alert.ticker];
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
                             isTriggered = percentDiff <= alert.threshold_value;
                         }
                         break;
                 }
                 newTriggered[alert.id] = isTriggered;
             }
        });
        setTriggeredAlerts(newTriggered);

    }, [alerts, portfolioHoldings, watchlist]);

    const markAsRead = (id: number) => {
        updateAlert(id, { is_read: true });
    }

    const toggleSnooze = (id: number, currentSnooze: string | null) => {
        const newSnooze = currentSnooze ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        updateAlert(id, { snoozed_until: newSnooze });
    }

    // Helper to compute state (reused for table data)
    const getAlertState = (alert: Alert): AlertRow['state'] => {
        const isLiveTriggered = triggeredAlerts[alert.id];
        const isSnoozed = alert.snoozed_until && new Date(alert.snoozed_until) > new Date();
        
        if (isSnoozed) return "snoozed";
        if (isLiveTriggered) return "triggered";
        if (alert.is_read) return "read";
        return "pending";
    }

    const tableData = useMemo<AlertRow[]>(() => {
        return alerts.map(alert => ({
            ...alert,
            currentPrice: currentPrices[alert.ticker],
            companyName: companyNames[alert.ticker] || alert.ticker,
            state: getAlertState(alert)
        }));
    }, [alerts, currentPrices, companyNames, triggeredAlerts]);

    const columns = useMemo<MRT_ColumnDef<AlertRow>[]>(
        () => [
            {
                accessorKey: 'state',
                header: 'Status',
                size: 80,
                Cell: ({ cell }) => {
                    const state = cell.getValue<AlertRow['state']>();
                    return (
                        <div className={`flex items-center justify-center h-8 w-8 rounded-full mx-auto ${
                            state === 'triggered' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                            {state === 'triggered' ? <Zap className="h-4 w-4 fill-current" /> : <Bell className="h-4 w-4" />}
                        </div>
                    );
                },
                enableSorting: false,
                muiTableHeadCellProps: { align: 'center' },
                muiTableBodyCellProps: { align: 'center' },
            },
            {
                accessorKey: 'companyName',
                header: 'Asset',
                size: 200,
                Cell: ({ row }) => (
                    <Tooltip title={`Ticker: ${row.original.ticker}`}>
                        <div className="flex flex-col">
                             <span className="font-bold text-gray-900 block truncate cursor-help">
                                {row.original.companyName}
                             </span>
                        </div>
                    </Tooltip>
                ),
            },
            {
                accessorKey: 'currentPrice',
                header: 'Current Price',
                size: 120,
                Cell: ({ cell }) => (
                    <span className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                        {cell.getValue<number>()?.toFixed(2) || "..."}
                    </span>
                ),
                muiTableHeadCellProps: { align: 'right' },
                muiTableBodyCellProps: { align: 'right' },
            },
            {
                accessorKey: 'threshold_value', // using threshold as key but rendering custom combo
                header: 'Condition',
                size: 180,
                Cell: ({ row }) => (
                    <div className="flex items-center justify-center space-x-2">
                            <span className={`flex items-center text-sm font-medium ${
                            row.original.alert_type === AlertType.PRICE_ABOVE ? 'text-green-600' : 
                            row.original.alert_type === AlertType.PRICE_BELOW ? 'text-red-600' : 'text-gray-700'
                            }`}>
                            {row.original.alert_type === AlertType.PRICE_ABOVE ? <ArrowUp className="mr-1 h-3 w-3" /> : 
                                row.original.alert_type === AlertType.PRICE_BELOW ? <ArrowDown className="mr-1 h-3 w-3" /> : null}
                            {formatType(row.original.alert_type)}
                            </span>
                            {/* Hide threshold for crosses where value is 0/dummy */}
                            {(row.original.alert_type !== AlertType.SMA_50_ABOVE_SMA_200 && 
                              row.original.alert_type !== AlertType.SMA_50_BELOW_SMA_200) && (
                                <span className="font-bold text-gray-900">{row.original.threshold_value}</span>
                            )}
                    </div>
                ),
                muiTableHeadCellProps: { align: 'center' },
                muiTableBodyCellProps: { align: 'center' },
            },
            {
                id: 'info',
                header: 'Info',
                size: 250,
                Cell: ({ row }) => {
                    const alert = row.original;
                    return (
                        <div className="flex flex-col">
                            {alert.state === 'triggered' && <span className="text-xs text-red-600 font-bold uppercase tracking-wide">Condition Met</span>}
                            {alert.message ? (
                                <span className="text-sm text-gray-600 italic truncate" title={alert.message}>"{alert.message}"</span>
                            ) : (
                                <span className="text-xs text-gray-400">No note</span>
                            )}
                            <span className="text-[10px] text-gray-400 mt-0.5">
                                    {alert.snoozed_until ? `Snoozed until ${formatDate(alert.snoozed_until)}` : `Created ${formatDate(alert.created_at)}`}
                            </span>
                        </div>
                    )
                }
            }
        ],
        []
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

                renderRowActions={({ row }) => {
                    const alert = row.original;
                    return (
                         <div className="flex items-center gap-1">
                            {alert.state !== 'read' && (
                                <Tooltip title="Mark as read">
                                    <IconButton size="small" onClick={() => markAsRead(alert.id)}>
                                        <CheckCircle className="h-4 w-4 text-gray-400 hover:text-green-600" />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <Tooltip title={alert.snoozed_until ? "Unsnooze" : "Snooze for 24h"}>
                                <IconButton size="small" onClick={() => toggleSnooze(alert.id, alert.snoozed_until)}>
                                    <Clock className={`h-4 w-4 ${alert.snoozed_until ? "text-amber-500" : "text-gray-400 hover:text-amber-600"}`} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete alert">
                                <IconButton size="small" onClick={() => deleteAlert(alert.id)}>
                                    <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                                </IconButton>
                            </Tooltip>
                         </div>
                    )
                }}

                muiTopToolbarProps={{
                    sx: {
                        backgroundColor: "#e5e7eb",
                        paddingY: 1,
                        paddingX: 2,
                    },
                }}

                muiTableHeadCellProps={{
                    sx: {
                        backgroundColor: "#e5e7eb",
                    }
                }}
                
                muiBottomToolbarProps={{
                   sx: {
                       backgroundColor: "#e5e7eb",
                   },
                }}

                muiTableBodyRowProps={({ row }) => {
                    // Conditional styling based on state
                    let bg = '#fff';
                    let borderLeft = '4px solid transparent';
                    
                    switch(row.original.state) {
                        case 'triggered':
                            bg = '#fef2f2'; // red-50
                            borderLeft = '4px solid #ef4444'; // red-500
                            break;
                        case 'snoozed':
                           bg = '#f9fafb';
                           break;
                        case 'pending':
                             bg = '#eff6ff'; // blue-50
                             borderLeft = '4px solid #60a5fa'; // blue-400
                             break;
                        case 'read':
                        default:
                            bg = '#fff';
                            break;
                    }

                    return {
                        onClick: () => navigate(`/stock-details/${row.original.ticker}`),
                        sx: {
                            cursor: 'pointer',
                            backgroundColor: bg,
                            borderLeft: borderLeft,
                            opacity: row.original.state === 'snoozed' ? 0.7 : 1,
                            '&:hover': {
                                backgroundColor: row.original.state === 'triggered' ? '#fee2e2' : '#f3f4f6' // darken slightly on hover
                            }
                        }
                    }
                }}
            />
        </div>
    )
}
