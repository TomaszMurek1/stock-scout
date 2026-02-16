import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/services/apiClient";
import { useTranslation } from "react-i18next";
import "./TelegramConnect.css";

interface TelegramStatus {
    connected: boolean;
    chat_id: string | null;
}

export function TelegramConnect() {
    const { t } = useTranslation();
    const [status, setStatus] = useState<TelegramStatus>({ connected: false, chat_id: null });
    const [loading, setLoading] = useState(true);
    const [linking, setLinking] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const { data } = await apiClient.get<TelegramStatus>("/telegram/status");
            setStatus(data);
            // Stop polling if connected
            if (data.connected && pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
                setLinking(false);
            }
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [fetchStatus]);

    const handleConnect = async () => {
        setLinking(true);
        try {
            const { data } = await apiClient.get<{ url: string; token: string }>("/telegram/link-token");
            window.open(data.url, "_blank");
            // Start polling every 3s to detect pairing
            pollingRef.current = setInterval(fetchStatus, 3000);
        } catch {
            setLinking(false);
        }
    };

    const handleDisconnect = async () => {
        setDisconnecting(true);
        try {
            await apiClient.delete("/telegram/disconnect");
            setStatus({ connected: false, chat_id: null });
        } catch {
            // ignore
        } finally {
            setDisconnecting(false);
        }
    };

    if (loading) return null;

    return (
        <div className="telegram-connect-card">
            <div className="telegram-connect-header">
                <div className="telegram-connect-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                </div>
                <span className="telegram-connect-title">
                    {t("portfolio.alerts.telegram.title", "Telegram Notifications")}
                </span>
                {status.connected && (
                    <span className="telegram-connect-badge connected">
                        ✅ {t("portfolio.alerts.telegram.connected", "Connected")}
                    </span>
                )}
            </div>

            <div className="telegram-connect-body">
                {status.connected ? (
                    <div className="telegram-connected-info">
                        <p className="telegram-chat-id-label">
                            Chat ID: <code>{status.chat_id}</code>
                        </p>
                        <p className="telegram-connected-desc">
                            {t("portfolio.alerts.telegram.connected_desc", "You'll receive alert notifications via Telegram.")}
                        </p>
                        <button
                            onClick={handleDisconnect}
                            disabled={disconnecting}
                            className="telegram-disconnect-btn"
                        >
                            {disconnecting
                                ? t("common.loading", "Loading...")
                                : t("portfolio.alerts.telegram.disconnect", "Disconnect")}
                        </button>
                    </div>
                ) : (
                    <div className="telegram-not-connected">
                        <p className="telegram-connect-desc">
                            {t("portfolio.alerts.telegram.connect_desc", "Connect your Telegram to receive instant alert notifications on your phone.")}
                        </p>
                        <button
                            onClick={handleConnect}
                            disabled={linking}
                            className="telegram-connect-btn"
                        >
                            {linking
                                ? t("portfolio.alerts.telegram.waiting", "Waiting for connection...")
                                : t("portfolio.alerts.telegram.connect", "Connect Telegram")}
                        </button>
                        {linking && (
                            <p className="telegram-waiting-hint">
                                {t("portfolio.alerts.telegram.waiting_hint", "Click 'Start' in Telegram, then come back here.")}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
