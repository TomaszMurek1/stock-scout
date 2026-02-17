import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/services/apiClient";
import { useTranslation } from "react-i18next";
import "./SmaMonitoring.css";

interface SmaPreferences {
    sma50_cross_above: boolean;
    sma50_cross_below: boolean;
    sma200_cross_above: boolean;
    sma200_cross_below: boolean;
    sma50_distance_25: boolean;
    sma50_distance_50: boolean;
    sma200_distance_25: boolean;
    sma200_distance_50: boolean;
}

const DEFAULT_PREFS: SmaPreferences = {
    sma50_cross_above: false,
    sma50_cross_below: false,
    sma200_cross_above: false,
    sma200_cross_below: false,
    sma50_distance_25: false,
    sma50_distance_50: false,
    sma200_distance_25: false,
    sma200_distance_50: false,
};

type ToggleGroup = {
    titleKey: string;
    titleFallback: string;
    icon: string;
    items: { key: keyof SmaPreferences; labelKey: string; fallback: string }[];
};

const TOGGLE_GROUPS: ToggleGroup[] = [
    {
        titleKey: "portfolio.alerts.sma.group_sma50",
        titleFallback: "SMA 50",
        icon: "⚡",
        items: [
            { key: "sma50_cross_above", labelKey: "portfolio.alerts.sma.sma50_cross_above", fallback: "Price goes above SMA 50" },
            { key: "sma50_cross_below", labelKey: "portfolio.alerts.sma.sma50_cross_below", fallback: "Price drops below SMA 50" },
            { key: "sma50_distance_25", labelKey: "portfolio.alerts.sma.sma50_distance_25", fallback: "Price ≥25% from SMA 50" },
            { key: "sma50_distance_50", labelKey: "portfolio.alerts.sma.sma50_distance_50", fallback: "Price ≥50% from SMA 50" },
        ],
    },
    {
        titleKey: "portfolio.alerts.sma.group_sma200",
        titleFallback: "SMA 200",
        icon: "📐",
        items: [
            { key: "sma200_cross_above", labelKey: "portfolio.alerts.sma.sma200_cross_above", fallback: "Price goes above SMA 200" },
            { key: "sma200_cross_below", labelKey: "portfolio.alerts.sma.sma200_cross_below", fallback: "Price drops below SMA 200" },
            { key: "sma200_distance_25", labelKey: "portfolio.alerts.sma.sma200_distance_25", fallback: "Price ≥25% from SMA 200" },
            { key: "sma200_distance_50", labelKey: "portfolio.alerts.sma.sma200_distance_50", fallback: "Price ≥50% from SMA 200" },
        ],
    },
];

export function SmaMonitoring() {
    const { t } = useTranslation();
    const [prefs, setPrefs] = useState<SmaPreferences>(DEFAULT_PREFS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState(true);

    const activeCount = Object.values(prefs).filter(Boolean).length;

    const fetchPrefs = useCallback(async () => {
        try {
            const { data } = await apiClient.get<SmaPreferences>("/alert-preferences/");
            setPrefs(data);
            // Auto-expand if any toggle is active
            if (Object.values(data).some(Boolean)) {
                setCollapsed(false);
            }
        } catch {
            // User has no prefs yet — defaults are fine
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPrefs();
    }, [fetchPrefs]);

    const togglePref = async (key: keyof SmaPreferences) => {
        const newValue = !prefs[key];
        // Optimistic update
        setPrefs((prev) => ({ ...prev, [key]: newValue }));
        setSaving(key);
        try {
            const { data } = await apiClient.put<SmaPreferences>("/alert-preferences/", {
                [key]: newValue,
            });
            setPrefs(data);
        } catch {
            // Revert on error
            setPrefs((prev) => ({ ...prev, [key]: !newValue }));
        } finally {
            setSaving(null);
        }
    };

    if (loading) return null;

    return (
        <div className="sma-card">
            {/* Collapsible header */}
            <button
                className="sma-header"
                onClick={() => setCollapsed(!collapsed)}
                aria-expanded={!collapsed}
            >
                <div className="sma-header-left">
                    <span className="sma-header-icon">📊</span>
                    <span className="sma-header-title">
                        {t("portfolio.alerts.sma.title", "SMA Monitoring")}
                    </span>
                    {activeCount > 0 && (
                        <span className="sma-active-badge">{activeCount}</span>
                    )}
                </div>
                <svg
                    className={`sma-chevron ${collapsed ? "" : "open"}`}
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {/* Collapsible body */}
            <div className={`sma-body ${collapsed ? "collapsed" : ""}`}>
                <p className="sma-desc">
                    {t("portfolio.alerts.sma.description", "Automatically monitor SMA conditions for all your holdings and watchlist tickers.")}
                </p>

                {TOGGLE_GROUPS.map((group) => (
                    <div key={group.titleKey} className="sma-group">
                        <div className="sma-group-title">
                            <span>{group.icon}</span>
                            <span>{t(group.titleKey, group.titleFallback)}</span>
                        </div>
                        <div className="sma-group-items">
                            {group.items.map(({ key, labelKey, fallback }) => (
                                <label key={key} className="sma-toggle-row">
                                    <span className="sma-toggle-label">{t(labelKey, fallback)}</span>
                                    <button
                                        className={`sma-switch ${prefs[key] ? "on" : ""}`}
                                        onClick={() => togglePref(key)}
                                        disabled={saving === key}
                                        aria-label={t(labelKey, fallback)}
                                    >
                                        <span className="sma-knob" />
                                    </button>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
