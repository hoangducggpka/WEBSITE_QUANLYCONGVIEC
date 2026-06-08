import styles from "./NavBar.module.css";

import { LuBell } from "react-icons/lu";
import { RiMessageFill } from "react-icons/ri";
import { RiCloseCircleFill } from "react-icons/ri";
import { RiDeleteBin6Line } from "react-icons/ri";
import { FaCaretDown } from "react-icons/fa";
import { BsCheckAll } from "react-icons/bs";
import { MdCircleNotifications } from "react-icons/md";

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";

const API_BASE  = "http://127.0.0.1:8000";
const WS_BASE   = "ws://localhost:8000";
const MEDIA_URL = "http://127.0.0.1:8000";

const PRIORITY_MAP = {
    1: { label: "Thấp", color: "#6b7280" },
    2: { label: "TB",   color: "#3b82f6" },
    3: { label: "Cao",  color: "#f59e0b" },
    4: { label: "Khẩn", color: "#ef4444" },
};

function timeAgo(isoString) {
    const diff = (Date.now() - new Date(isoString)) / 1000;
    if (diff < 60)    return "Vừa xong";
    if (diff < 3600)  return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
}

// ─── Hook: useNotifications ───────────────────────────────────────────────────
function useNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount]     = useState(0);
    const [isLoading, setIsLoading]         = useState(false);
    const [hasMore, setHasMore]             = useState(false);
    const wsRef          = useRef(null);
    const reconnectTimer = useRef(null);

    const authHeaders = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access")}`,
    });

    const fetchNotifications = useCallback(async (page = 1) => {
        setIsLoading(true);
        try {
            const res  = await apiFetch(
                `/notifications/list/?page=${page}`,
                { headers:{} }
            );
            const json = await res.json();
            const msgs = json.results?.messages ?? [];
            if (page === 1) setNotifications(msgs);
            else setNotifications((prev) => [...prev, ...msgs]);
            setHasMore(!!json.next);
            setUnreadCount(json.results?.unread ?? 0);
        } catch (err) {
            console.error("fetchNotifications:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const markRead = useCallback(async (id) => {
        try {
            await apiFetch(`/notifications/${id}/read/`, {
                method: "PATCH", headers: {},
            });
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
            setUnreadCount((c) => Math.max(0, c - 1));
        } catch (err) { console.error("markRead:", err); }
    }, []);

    const markAllRead = useCallback(async () => {
        try {
            await apiFetch(`/notifications/read-all/`, {
                method: "PATCH", headers: {},
            });
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) { console.error("markAllRead:", err); }
    }, []);

    const deleteAllRead = useCallback(async () => {
        try {
            await apiFetch(`/notifications/delete-all/`, {
                method: "DELETE", headers: {},
            });
            setNotifications((prev) => prev.filter((n) => !n.is_read));
        } catch (err) { console.error("deleteAllRead:", err); }
    }, []);

    const connectWS = useCallback(() => {
        const token = localStorage.getItem("access");
        if (!token) return;
        const ws = new WebSocket(`${WS_BASE}/ws/notifications/?token=${token}`);
        wsRef.current = ws;

        ws.onopen  = () => { clearTimeout(reconnectTimer.current); };
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setNotifications((prev) => [data, ...prev]);
                setUnreadCount(c => c + 1);
            } catch (e) { console.error("[WS] parse:", e); }
        };
        ws.onclose = () => {
            reconnectTimer.current = setTimeout(connectWS, 5000);
        };
        ws.onerror = () => ws.close();
    }, []);

    useEffect(() => {
        fetchNotifications();
        connectWS();
        return () => {
            clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, [fetchNotifications, connectWS]);

    return { notifications, unreadCount, isLoading, hasMore, fetchNotifications, markRead, markAllRead, deleteAllRead };
}

// ─── NotificationPanel ────────────────────────────────────────────────────────
function NotificationPanel({ notifications, isLoading, hasMore, unreadCount, onClose, onMarkRead, onMarkAllRead, onDeleteAllRead, onLoadMore }) {
    const listRef   = useRef(null);
    const readCount = notifications.filter((n) => n.is_read).length;

    const handleScroll = useCallback(() => {
        const el = listRef.current;
        if (!el || isLoading || !hasMore) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) onLoadMore();
    }, [isLoading, hasMore, onLoadMore]);

    return (
        <div className={styles.notification}>

            <div className={styles.notification_header}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <MdCircleNotifications style={{ fontSize:22, color:"#4a90e2" }} />
                    <h3>Thông báo</h3>
                    {unreadCount > 0 && (
                        <span className={styles.badge} style={{ position:"static", border:"none" }}>
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </div>

                <div className={styles.notification_actions}>
                    {unreadCount > 0 && (
                        <button
                            className={styles.read_all}
                            onClick={onMarkAllRead}
                            style={{ display:"flex", alignItems:"center", gap:4 }}
                        >
                            <BsCheckAll /> Đọc tất cả
                        </button>
                    )}
                    {readCount > 0 && (
                        <button
                            className={styles.read_all}
                            onClick={onDeleteAllRead}
                            style={{ display:"flex", alignItems:"center", gap:4, color:"#ef4444" }}
                        >
                            <RiDeleteBin6Line /> Xóa đã đọc
                        </button>
                    )}
                    <button className={styles.close_button} onClick={onClose}>
                        <RiCloseCircleFill />
                    </button>
                </div>
            </div>

            <div className={styles.notification_list} ref={listRef} onScroll={handleScroll}>

                {notifications.length === 0 && !isLoading && (
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"48px 16px", color:"#aaa", gap:10 }}>
                        <MdCircleNotifications style={{ fontSize:48, opacity:0.3 }} />
                        <p style={{ margin:0, fontSize:13 }}>Không có thông báo nào</p>
                    </div>
                )}

                {notifications.map((item) => {
                    const priority = PRIORITY_MAP[item.priority] ?? PRIORITY_MAP[1];
                    return (
                        <div
                            key={item.id}
                            className={`${styles.notification_item} ${!item.is_read ? styles.unread : ""}`}
                            onClick={() => !item.is_read && onMarkRead(item.id)}
                        >
                            <div className={styles.notification_avatar}>
                                {item.avatar ? (
                                    <img src={item.avatar} alt="" className={styles.notification_avatar_img} />
                                ) : (
                                    <div
                                        className={styles.system_avatar}
                                        style={{ background: priority.color }}
                                        title={`Ưu tiên: ${priority.label}`}
                                    >
                                        {priority.label}
                                    </div>
                                )}
                            </div>

                            <div className={styles.notification_content}>
                                <div className={styles.notification_title}>{item.content}</div>
                                {item.project_id && (
                                    <div className={styles.notification_description}>
                                        # Dự án {item.project_id}
                                    </div>
                                )}
                                <div className={styles.notification_time}>{timeAgo(item.created_at)}</div>
                            </div>

                            {!item.is_read && <div className={styles.unread_dot} />}
                        </div>
                    );
                })}

                {isLoading && (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:14, fontSize:13, color:"#aaa" }}>
                        <span style={{ width:16, height:16, border:"2px solid #e2e8f0", borderTopColor:"#4a90e2", borderRadius:"50%", display:"inline-block", animation:"spin 0.7s linear infinite" }} />
                        Đang tải...
                    </div>
                )}

                {hasMore && !isLoading && (
                    <button
                        onClick={onLoadMore}
                        style={{ width:"100%", padding:12, background:"none", border:"none", borderTop:"1px solid #eee", color:"#4a90e2", fontWeight:600, fontSize:13, cursor:"pointer" }}
                    >
                        Tải thêm
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── NavBar ───────────────────────────────────────────────────────────────────
function NavBar() {
    const { user, logout }  = useAuth();
    const [active, setActive] = useState("Tổng quan");
    const navigate            = useNavigate();
    const [openDropdown, setOpenDropdown]       = useState(false);
    const [openNotification, setOpenNotification] = useState(false);
    const [currentPage, setCurrentPage]         = useState(1);
    const [unreadMessages]                      = useState(5);

    const { notifications, unreadCount, isLoading, hasMore, fetchNotifications, markRead, markAllRead, deleteAllRead } = useNotifications();

    const handleClick = (item) => {
        setActive(item);
        localStorage.setItem("current_page", item);
        if (item === "Tổng quan") navigate("/overview");
        if (item === "Dự án")   navigate(localStorage.getItem("project_page_last_route") || "/projects");
        if (item === "Nhóm")    navigate(localStorage.getItem("group_page_last_route")   || "/groups");
        if (item === "Công việc") navigate("/tasks");
    };

    useEffect(() => {
        const savedPage = localStorage.getItem("current_page");
        if (savedPage) { setActive(savedPage); handleClick(savedPage); }
    }, []);

    const handleLoadMore = () => {
        const next = currentPage + 1;
        setCurrentPage(next);
        fetchNotifications(next);
    };

    return (
        <>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div className={styles.navbar_container}>
                <div className={styles.navbar}>

                    <div className={styles.logo_container}>
                        <img src="/logo.png" alt="logo" className={styles.logo} />
                    </div>

                    <div className={styles.menu}>
                        {["Tổng quan", "Dự án", "Nhóm", "Công việc"].map((item) => (
                            <button
                                key={item}
                                onClick={() => handleClick(item)}
                                className={`${styles.menu_button} ${active === item ? styles.active : ""}`}
                            >
                                {item}
                            </button>
                        ))}
                    </div>

                    <div className={styles.personal}>

                        {/* Bell */}
                        <div className={styles.notification_wrapper}>
                            <div
                                className={styles.icon_container}
                                onClick={() => {
                                    setOpenDropdown(false);
                                    setOpenNotification((prev) => !prev);
                                }}
                            >
                                <LuBell className={styles.icon} />
                                {unreadCount > 0 && (
                                    <span className={styles.badge}>
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                )}
                            </div>

                            {openNotification && (
                                <NotificationPanel
                                    notifications={notifications}
                                    unreadCount={unreadCount}
                                    isLoading={isLoading}
                                    hasMore={hasMore}
                                    onClose={() => setOpenNotification(false)}
                                    onMarkRead={markRead}
                                    onMarkAllRead={markAllRead}
                                    onDeleteAllRead={deleteAllRead}
                                    onLoadMore={handleLoadMore}
                                />
                            )}
                        </div>

                        {/* Messages */}
                        <div className={styles.icon_container}>
                            <RiMessageFill className={styles.icon} onClick={() => navigate("/messages")} />
                            {unreadMessages > 0 && (
                                <span className={styles.badge}>
                                    {unreadMessages > 9 ? "9+" : unreadMessages}
                                </span>
                            )}
                        </div>

                        {/* Profile */}
                        <div
                            className={styles.profile}
                            onClick={() => {
                                setOpenNotification(false);
                                setOpenDropdown((prev) => !prev);
                            }}
                        >
                            <div className={styles.avatar_container}>
                                <img
                                    src={user?.avatarpath ? `${MEDIA_URL}${user.avatarpath}` : "/5.png"}
                                    alt="avatar"
                                    className={styles.avatar}
                                />
                            </div>
                            <FaCaretDown />

                            {openDropdown && (
                                <div className={styles.dropdown}>
                                    <button className={styles.dropdown_item} onClick={() => navigate("/profile")}>Hồ sơ</button>
                                    <button className={styles.dropdown_item}>Cài đặt</button>
                                    <button className={styles.dropdown_item}>Trợ giúp</button>
                                    <button className={styles.dropdown_item} onClick={() => { logout(); navigate("/login"); }}>Đăng xuất</button>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
}

export default NavBar;
