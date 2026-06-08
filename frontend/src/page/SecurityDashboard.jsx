import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./SecurityDashboard.module.css";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const WS_BASE = "ws://127.0.0.1:8000";

const SEVERITY_CONFIG = {
    LOW:      { label: "Thấp",     color: "low"      },
    MEDIUM:   { label: "Trung bình", color: "medium" },
    HIGH:     { label: "Cao",      color: "high"     },
    CRITICAL: { label: "Nghiêm trọng", color: "critical" },
};

const EVENT_CONFIG = {
    LOGIN_BRUTEFORCE: { label: "Brute Force",   icon: "🔓" },
    JWT_ABUSE:        { label: "JWT Abuse",      icon: "🪪" },
    FORCE_LOGOUT:     { label: "Force Logout",   icon: "🚪" },
};

function timeAgo(isoString) {
    const diff = (Date.now() - new Date(isoString)) / 1000;
    if (diff < 60)    return "Vừa xong";
    if (diff < 3600)  return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
}

function SeverityBadge({ severity }) {
    const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.LOW;
    return (
        <span className={`${styles.badge} ${styles[`badge_${cfg.color}`]}`}>
            {cfg.label}
        </span>
    );
}

function EventRow({ event, isNew }) {
    const evtCfg = EVENT_CONFIG[event.event_type] ?? { label: event.event_type, icon: "⚠️" };
    return (
        <div className={`${styles.event_row} ${isNew ? styles.event_row_new : ""}`}>
            <div className={styles.event_icon}>{evtCfg.icon}</div>
            <div className={styles.event_body}>
                <div className={styles.event_top}>
                    <span className={styles.event_type}>{evtCfg.label}</span>
                    <SeverityBadge severity={event.severity} />
                </div>
                <p className={styles.event_desc}>{event.description}</p>
                <div className={styles.event_meta}>
                    <span className={styles.meta_item}>
                        <span className={styles.meta_label}>IP</span>
                        {event.ip_address}
                    </span>
                    <span className={styles.meta_item}>
                        <span className={styles.meta_label}>Endpoint</span>
                        {event.endpoint}
                    </span>
                    {event.user && (
                        <span className={styles.meta_item}>
                            <span className={styles.meta_label}>User</span>
                            {event.user}
                        </span>
                    )}
                    <span className={styles.meta_time}>{timeAgo(event.created_at)}</span>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, color }) {
    return (
        <div className={`${styles.stat_card} ${styles[`stat_${color}`]}`}>
            <span className={styles.stat_value}>{value}</span>
            <span className={styles.stat_label}>{label}</span>
        </div>
    );
}

function SecurityDashboard() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const [events, setEvents] = useState([]);
    const [newIds, setNewIds] = useState(new Set());
    const [wsStatus, setWsStatus] = useState("connecting");
    const [filter, setFilter] = useState("ALL");
    const wsRef = useRef(null);
    const reconnectTimer = useRef(null);

    const fetchEvents = useCallback(async () => {
        try {
            const res = await apiFetch("/security/events/", { headers: {} });
            const data = await res.json();
            setEvents(data);
        } catch (err) {
            console.error("fetchEvents:", err);
        }
    }, []);

    const connectWS = useCallback(() => {
        const token = localStorage.getItem("access");
        if (!token) return;
        const ws = new WebSocket(`${WS_BASE}/ws/security/?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
            setWsStatus("connected");
            clearTimeout(reconnectTimer.current);
        };

        ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                setEvents((prev) => [data, ...prev]);
                setNewIds((prev) => new Set([...prev, data.id]));
                setTimeout(() => {
                    setNewIds((prev) => {
                        const next = new Set(prev);
                        next.delete(data.id);
                        return next;
                    });
                }, 3000);
            } catch (err) {
                console.error("[WS] parse:", err);
            }
        };

        ws.onclose = () => {
            setWsStatus("disconnected");
            reconnectTimer.current = setTimeout(connectWS, 5000);
        };

        ws.onerror = () => ws.close();
    }, []);

    useEffect(() => {
        fetchEvents();
        connectWS();
        return () => {
            clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, [fetchEvents, connectWS]);

    const counts = {
        total:    events.length,
        critical: events.filter((e) => e.severity === "CRITICAL").length,
        high:     events.filter((e) => e.severity === "HIGH").length,
        brute:    events.filter((e) => e.event_type === "LOGIN_BRUTEFORCE").length,
    };

    const filtered = filter === "ALL"
        ? events
        : events.filter((e) => e.severity === filter || e.event_type === filter);

    return (
        <div className={styles.wrapper}>

            {/* Header */}
            <div className={styles.header}>
                <div className={styles.header_left}>
                    <h1 className={styles.title}>Security Dashboard</h1>
                    <div className={`${styles.ws_dot} ${styles[`ws_${wsStatus}`]}`} title={wsStatus} />
                    <span className={styles.ws_label}>
                        {wsStatus === "connected" ? "Live" : wsStatus === "connecting" ? "Đang kết nối..." : "Mất kết nối"}
                    </span>
                </div>
                <button
                    className={styles.logout_btn}
                    onClick={() => { logout(); navigate("/login"); }}
                >
                    Đăng xuất
                </button>
            </div>

            {/* Stats */}
            <div className={styles.stats_grid}>
                <StatCard label="Tổng sự kiện" value={counts.total}    color="neutral" />
                <StatCard label="Critical"      value={counts.critical} color="critical" />
                <StatCard label="High"          value={counts.high}     color="high" />
                <StatCard label="Brute Force"   value={counts.brute}    color="medium" />
            </div>

            {/* Filter */}
            <div className={styles.filter_bar}>
                {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW", "LOGIN_BRUTEFORCE", "JWT_ABUSE", "FORCE_LOGOUT"].map((f) => (
                    <button
                        key={f}
                        className={`${styles.filter_btn} ${filter === f ? styles.filter_btn_active : ""}`}
                        onClick={() => setFilter(f)}
                    >
                        {f === "ALL" ? "Tất cả" : (EVENT_CONFIG[f]?.label ?? SEVERITY_CONFIG[f]?.label ?? f)}
                    </button>
                ))}
            </div>

            {/* Event list */}
            <div className={styles.event_list}>
                {filtered.length === 0 ? (
                    <div className={styles.empty}>Không có sự kiện nào</div>
                ) : (
                    filtered.map((evt) => (
                        <EventRow key={evt.id} event={evt} isNew={newIds.has(evt.id)} />
                    ))
                )}
            </div>

        </div>
    );
}

export default SecurityDashboard;