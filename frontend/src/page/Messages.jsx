import styles from "./Messages.module.css";
import { motion, AnimatePresence } from "framer-motion";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    RiSearch2Line, RiMessage3Fill, RiGroupFill, RiUser3Fill,
    RiAttachment2, RiImage2Fill, RiSendPlaneFill, RiMore2Fill,
    RiCheckDoubleFill, RiEmotionHappyLine, RiDeleteBin6Line,
    RiShareForwardLine, RiReplyLine, RiWifiOffLine, RiWifiFill,
    RiLoader4Line, RiPushpin2Line, RiPushpinLine, RiCloseLine,
    RiArrowGoBackLine, RiTimeLine, RiFile3Line, RiImageLine,
    RiCheckLine, RiCloseFill,
} from "react-icons/ri";
import { apiFetch } from "../utils/api";
import { API_BASE } from "../config/env";
const WS_BASE =
    import.meta.env.VITE_WS_BASE ||
    "ws://localhost:8000";

const toAbsUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;   // đã absolute rồi
    return `${API_BASE}${url}`;
};

const EMOJI_LIST = ["👍","❤️","😂","😮","😢","😡","🎉","🔥","👏","✅"];

function Messages() {
    const socketRef        = useRef(null);
    const reconnectTimer   = useRef(null);
    const messageEndRef    = useRef(null);
    const currentConvRef   = useRef(null);
    const fileInputRef     = useRef(null);
    const imageInputRef    = useRef(null);

    const [conversations,      setConversations]      = useState([]);
    const [messages,           setMessages]           = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [activeTab,          setActiveTab]          = useState("all");
    const [messageValue,       setMessageValue]       = useState("");
    const [connectionStatus,   setConnectionStatus]   = useState("disconnected");
    const [searchValue,        setSearchValue]        = useState("");
    const [loadingConvs,       setLoadingConvs]       = useState(true);
    const [loadingMsgs,        setLoadingMsgs]        = useState(false);

    // Feature states
    const [replyTo,            setReplyTo]            = useState(null);   // { id, content, sender_name }
    const [pinnedMessages,     setPinnedMessages]     = useState([]);     // list of message objects
    const [showPinned,         setShowPinned]         = useState(false);
    const [hoveredMsg,         setHoveredMsg]         = useState(null);
    const [showEmojiPicker,    setShowEmojiPicker]    = useState(null);   // message id
    const [showMsgMenu,        setShowMsgMenu]        = useState(null);   // message id
    const [reactions,          setReactions]          = useState({});     // { msgId: [{emoji, users}] }
    const [recallConfirm,      setRecallConfirm]      = useState(null);   // message id

    // Thêm state để navigate giữa các pin
    const [pinnedIndex, setPinnedIndex] = useState(0);
    const [hidePinnedBar, setHidePinnedBar] = useState(false);



    const token = localStorage.getItem("access");

    const currentUserId = (() => {
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            return payload.user_id;
        } catch { return null; }
    })();

    // ── Helpers ───────────────────────────────────────────────────

    const scrollToBottom = (behavior = "smooth") => {
        messageEndRef.current?.scrollIntoView({ behavior });
    };

    const canRecall = (msg) => {
        if (msg.sender_id !== currentUserId) return false;
        const diff = (Date.now() - new Date(msg.created_at).getTime()) / 1000 / 60;
        return diff <= 15;
    };

    // ── Fetch conversations ───────────────────────────────────────

    const fetchConversations = useCallback(async () => {
        try {
            const res  = await apiFetch(`/chat/conversations/`, { headers: {}, method: "GET" });
            const data = await res.json();
            setConversations(data);
        } catch (e) {
            console.error("[Chat] fetch conversations:", e);
        } finally {
            setLoadingConvs(false);
        }
    }, []);

    // ── Fetch messages ────────────────────────────────────────────
    const fetchMessages = useCallback(async (convUuid) => {
        if (!convUuid) return;
        setLoadingMsgs(true);
        try {
            const res  = await apiFetch(`/chat/conversations/${convUuid}/messages/`, { headers: {} });
            const data = await res.json();
            setMessages(data);
            const pinned = data.filter(m => m.is_pinned);
            setPinnedMessages(pinned);

            // ── THÊM: load reactions từ server ──
            const initialReactions = {};
            data.forEach(msg => {
                if (msg.reactions && msg.reactions.length > 0) {
                    initialReactions[msg.id] = msg.reactions.map(r => ({
                        emoji: r.emoji,
                        users: r.users,  // từ serializer: [user_id, ...]
                    }));
                }
            });
            setReactions(initialReactions);

        } catch (e) {
            console.error("[Chat] fetch messages:", e);
        } finally {
            setLoadingMsgs(false);
        }
    }, []);
    // const fetchMessages = useCallback(async (convUuid) => {
    //     if (!convUuid) return;
    //     setLoadingMsgs(true);
    //     try {
    //         const res  = await apiFetch(`/chat/conversations/${convUuid}/messages/`, { headers: {} });
    //         const data = await res.json();
    //         setMessages(data);
    //         // Extract pinned messages from loaded msgs
    //         const pinned = data.filter(m => m.is_pinned);
    //         setPinnedMessages(pinned);
    //     } catch (e) {
    //         console.error("[Chat] fetch messages:", e);
    //     } finally {
    //         setLoadingMsgs(false);
    //     }
    // }, []);

    // ── WebSocket ─────────────────────────────────────────────────
    const messageRefs = useRef({});

    const scrollToMessage = (msgId) => {
    const el = messageRefs.current[msgId];
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            // Flash highlight
            el.classList.add(styles.highlight_msg);
            setTimeout(() => el.classList.remove(styles.highlight_msg), 1500);
        }
        setShowPinned(false);
    };
    const connectWS = useCallback((convUuid) => {
        if (!token || !convUuid) return;
        if (socketRef.current) {
            socketRef.current.onclose = null;
            socketRef.current.close();
        }
        const ws = new WebSocket(`${WS_BASE}/ws/chat/${convUuid}/?token=${token}`);
        socketRef.current = ws;
        setConnectionStatus("connecting");

        ws.onopen = () => {
            clearTimeout(reconnectTimer.current);
            setConnectionStatus("connected");
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "chat_message") {
                    setMessages(prev => [...prev, {
                        id:            data.message_id,
                        uuid:          data.message_uuid,
                        content:       data.message,
                        type:          data.message_type,
                        sender_id:     data.sender_id,
                        sender_name:   data.sender_name,
                        sender_avatar: data.sender_avatar,
                        created_at:    data.created_at,
                        reply_to_data: data.reply_to_data ?? null,
                        is_deleted:    false,
                        is_pinned:     data.is_pinned ?? false,
                        file_url:      data.file_url ?? null,   // ← thêm
                        file_name:     data.file_name ?? null,  // ← thêm
                    }]);
                } else if (data.type === "message_recalled") {
                    setMessages(prev => prev.map(m =>
                        m.id === data.message_id
                            ? { ...m, is_deleted: true, content: "Tin nhắn đã được thu hồi" }
                            : m
                    ));
                } else if (data.type === "message_pinned") {
                    setMessages(prev => prev.map(m =>
                        m.id === data.message_id ? { ...m, is_pinned: true } : m
                    ));
                    setPinnedMessages(prev => {
                        const exists = prev.find(m => m.id === data.message_id);
                        return exists ? prev : [...prev, data.message_data];
                    });
                } else if (data.type === "message_unpinned") {
                    setMessages(prev => prev.map(m =>
                        m.id === data.message_id ? { ...m, is_pinned: false } : m
                    ));
                    setPinnedMessages(prev => prev.filter(m => m.id !== data.message_id));
                } else if (data.type === "message_reacted") {
                    setReactions(prev => ({
                        ...prev,
                        [data.message_id]: (data.reactions ?? []).map(r => ({
                            emoji: r.emoji,
                            users: r.users,
                        })),
                    }));
                }
            } catch (e) {
                console.error("[WS] parse:", e);
            }
        };

        ws.onclose = () => {
            setConnectionStatus("disconnected");
            reconnectTimer.current = setTimeout(() => {
                if (currentConvRef.current === convUuid) connectWS(convUuid);
            }, 5000);
        };
        ws.onerror = () => ws.close();
    }, [token]);

    // ── Select conversation ───────────────────────────────────────

    const handleSelectConversation = useCallback(async (conv) => {

        clearTimeout(reconnectTimer.current);

        setActiveConversation(conv);

        // mark as read
        try {

            await apiFetch(
                `/chat/conversations/${conv.uuid}/read/`,
                {
                    method: "POST",
                    headers: {},
                }
            );

            setConversations(prev =>
                prev.map(c =>
                    c.uuid === conv.uuid
                        ? { ...c, unread_count: 0 }
                        : c
                )
            );

            setUnreadMessages(prev =>
                Math.max(0, prev - conv.unread_count)
            );

        } catch (e) {
            console.error("Mark read error:", e);
        }

        currentConvRef.current = conv.uuid;

        setMessages([]);
        setPinnedMessages([]);
        setReplyTo(null);
        setShowPinned(false);

        fetchMessages(conv.uuid);
        connectWS(conv.uuid);

        setHidePinnedBar(false);
        setPinnedIndex(0);

    }, [fetchMessages, connectWS]);
    // const handleSelectConversation = useCallback(async (conv) => {
    //     clearTimeout(reconnectTimer.current);
    //     setActiveConversation(conv);

    //     // mark read
    //     try {

    //         await apiFetch(
    //             `/chat/conversations/${conv.uuid}/read/`,
    //             {
    //                 method: "POST",
    //                 headers: {},
    //             }
    //         );

    //         // update local state ngay lập tức
    //         setConversations(prev =>
    //             prev.map(c =>
    //                 c.uuid === conv.uuid
    //                     ? { ...c, unread_count: 0 }
    //                     : c
    //             )
    //         );

    //     } catch (e) {
    //         console.error("Mark read error:", e);
    //     }
    //     currentConvRef.current = conv.uuid;
    //     setMessages([]);
    //     setPinnedMessages([]);
    //     setReplyTo(null);
    //     setShowPinned(false);
    //     fetchMessages(conv.uuid);
    //     connectWS(conv.uuid);
    //         // Reset khi đổi conversation (trong handleSelectConversation)
    //     setHidePinnedBar(false);
    //     setPinnedIndex(0);
    // }, [fetchMessages, connectWS]);

    // ── Send message ──────────────────────────────────────────────

    const handleSendMessage = useCallback(() => {
        if (!messageValue.trim()) return;
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
        socketRef.current.send(JSON.stringify({
            message: messageValue,
            reply_to: replyTo?.id ?? null,
        }));
        setMessageValue("");
        setReplyTo(null);
    }, [messageValue, replyTo]);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // ── File / Image send ─────────────────────────────────────────

    const handleFileSend = async (e, type = "file") => {
        const file = e.target.files?.[0];
        if (!file || !activeConversation) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);
        if (replyTo) formData.append("reply_to", replyTo.id);

        try {
            await apiFetch(`/chat/conversations/${activeConversation.uuid}/send-file/`, {
                method: "POST",
                body: formData,
                headers: {},
            });
            setReplyTo(null);
        } catch (e) {
            console.error("File send error:", e);
        }
        e.target.value = "";
    };

    // ── Pin message ───────────────────────────────────────────────
    // handlePin — chỉ giữ optimistic update cho messages[], bỏ setPinnedMessages
    const handlePin = async (msg) => {
        const isPinned = msg.is_pinned;
        try {
            await apiFetch(`/chat/messages/${msg.id}/${isPinned ? "unpin" : "pin"}/`, {
                method: "POST",
                headers: {},
            });
            // ĐÃ XÓA: setPinnedMessages optimistic — để WS event xử lý
            // Chỉ optimistic update messages[] để pin_indicator/pinned_bubble cập nhật ngay
            setMessages(prev => prev.map(m =>
                m.id === msg.id ? { ...m, is_pinned: !isPinned } : m
            ));
        } catch (e) {
            console.error("Pin error:", e);
        }
        setShowMsgMenu(null);
    };
    // const handlePin = async (msg) => {
    //     const isPinned = msg.is_pinned;
    //     try {
    //         await apiFetch(`/chat/messages/${msg.id}/${isPinned ? "unpin" : "pin"}/`, {
    //             method: "POST",
    //             headers: {},
    //         });
    //         // Optimistic update
    //         setMessages(prev => prev.map(m =>
    //             m.id === msg.id ? { ...m, is_pinned: !isPinned } : m
    //         ));
    //         if (!isPinned) {
    //             setPinnedMessages(prev => [...prev, { ...msg, is_pinned: true }]);
    //         } else {
    //             setPinnedMessages(prev => prev.filter(m => m.id !== msg.id));
    //         }
    //     } catch (e) {
    //         console.error("Pin error:", e);
    //     }
    //     setShowMsgMenu(null);
    // };

    // ── Recall message ────────────────────────────────────────────

    const handleRecall = async (msgId) => {
        try {
            await apiFetch(`/chat/messages/${msgId}/recall/`, {
                method: "POST",
                headers: {},
            });
            setMessages(prev => prev.map(m =>
                m.id === msgId
                    ? { ...m, is_deleted: true, content: "Tin nhắn đã được thu hồi" }
                    : m
            ));
        } catch (e) {
            console.error("Recall error:", e);
        }
        setRecallConfirm(null);
        setShowMsgMenu(null);
    };

    // ── Reaction ──────────────────────────────────────────────────
    const handleReaction = async (msgId, emoji) => {
        // Optimistic update ngay
        setReactions(prev => {
            const msgReactions = prev[msgId] ?? [];
            const existing = msgReactions.find(r => r.emoji === emoji);
            if (existing) {
                const hasMe = existing.users.includes(currentUserId);
                return {
                    ...prev,
                    [msgId]: msgReactions.map(r =>
                        r.emoji === emoji
                            ? { ...r, users: hasMe
                                ? r.users.filter(u => u !== currentUserId)
                                : [...r.users, currentUserId] }
                            : r
                    ).filter(r => r.users.length > 0)
                };
            }
            return {
                ...prev,
                [msgId]: [...msgReactions, { emoji, users: [currentUserId] }]
            };
        });
        setShowEmojiPicker(null);

        // Gọi API để persist
        try {
            const res = await apiFetch(`/chat/messages/${msgId}/react/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emoji }),
            });
            const data = await res.json();
            // Sync lại với server response (source of truth)
            setReactions(prev => ({
                ...prev,
                [msgId]: (data.reactions ?? []).map(r => ({
                    emoji: r.emoji,
                    users: r.users,
                })),
            }));
        } catch (e) {
            console.error("Reaction error:", e);
        }
    };
    // const handleReaction = (msgId, emoji) => {
    //     setReactions(prev => {
    //         const msgReactions = prev[msgId] ?? [];
    //         const existing = msgReactions.find(r => r.emoji === emoji);
    //         if (existing) {
    //             const hasMe = existing.users.includes(currentUserId);
    //             return {
    //                 ...prev,
    //                 [msgId]: msgReactions.map(r =>
    //                     r.emoji === emoji
    //                         ? { ...r, users: hasMe
    //                             ? r.users.filter(u => u !== currentUserId)
    //                             : [...r.users, currentUserId] }
    //                         : r
    //                 ).filter(r => r.users.length > 0)
    //             };
    //         }
    //         return {
    //             ...prev,
    //             [msgId]: [...msgReactions, { emoji, users: [currentUserId] }]
    //         };
    //     });
    //     setShowEmojiPicker(null);
    // };

    // ── Effects ───────────────────────────────────────────────────

    useEffect(() => { fetchConversations(); }, [fetchConversations]);
    useEffect(() => { scrollToBottom(); }, [messages]);
    useEffect(() => {
        return () => {
            clearTimeout(reconnectTimer.current);
            socketRef.current?.close();
        };
    }, []);

    // Close menus on outside click
    useEffect(() => {
        const handler = () => {
            setShowMsgMenu(null);
            setShowEmojiPicker(null);
        };
        document.addEventListener("click", handler);
        return () => document.removeEventListener("click", handler);
    }, []);

    // ── Derived ───────────────────────────────────────────────────

    const filteredConversations = conversations.filter(c => {
        const matchTab =
            activeTab === "all"     ? true :
            activeTab === "friends" ? c.type === "private" :
            activeTab === "groups"  ? c.type === "group"   : true;
        const matchSearch = c.display_name?.toLowerCase().includes(searchValue.toLowerCase());
        return matchTab && matchSearch;
    });

    const formatTime = (iso) => {
        if (!iso) return "";
        return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const formatDate = (iso) => {
        if (!iso) return "";
        const d = new Date(iso);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return "Hôm nay";
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return "Hôm qua";
        return d.toLocaleDateString("vi-VN");
    };

    // Group messages by date
    const groupedMessages = (() => {
        const groups = [];
        let lastDate = null;
        messages.forEach(msg => {
            const dateStr = formatDate(msg.created_at);
            if (dateStr !== lastDate) {
                groups.push({ type: "date", label: dateStr });
                lastDate = dateStr;
            }
            groups.push({ type: "message", data: msg });
        });
        return groups;
    })();

    // ── Render ────────────────────────────────────────────────────

    return (
        <div className={styles.page}>

            {/* ── SIDEBAR ── */}
            <div className={styles.sidebar}>
                <div className={styles.sidebar_header}>
                    <h2>Tin nhắn</h2>
                    <div className={styles.header_right}>
                        <div className={`${styles.connection_badge} ${
                            connectionStatus === "connected" ? styles.connected : styles.disconnected
                        }`}>
                            {connectionStatus === "connected" ? <RiWifiFill /> : <RiWifiOffLine />}
                            <span>{connectionStatus}</span>
                        </div>
                        <button className={styles.header_icon_button}><RiMessage3Fill /></button>
                    </div>
                </div>

                <div className={styles.search_container}>
                    <RiSearch2Line className={styles.search_icon} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm..."
                        value={searchValue}
                        onChange={e => setSearchValue(e.target.value)}
                    />
                </div>

                <div className={styles.tabs}>
                    {[
                        { key: "all",     label: "Tất cả",  icon: null },
                        { key: "friends", label: "Bạn bè",  icon: <RiUser3Fill /> },
                        { key: "groups",  label: "Nhóm",    icon: <RiGroupFill /> },
                    ].map(({ key, label, icon }) => (
                        <button
                            key={key}
                            className={`${styles.tab_button} ${activeTab === key ? styles.active_tab : ""}`}
                            onClick={() => setActiveTab(key)}
                        >
                            {icon}{label}
                        </button>
                    ))}
                </div>

                <div className={styles.conversation_list}>
                    {loadingConvs ? (
                        <div className={styles.loading_state}><RiLoader4Line className={styles.spinner} /></div>
                    ) : filteredConversations.length === 0 ? (
                        <div className={styles.empty_state}>Không có cuộc trò chuyện</div>
                    ) : filteredConversations.map((item, index) => (
                        <motion.div
                            key={item.uuid}
                            className={`${styles.conversation_card} ${activeConversation?.uuid === item.uuid ? styles.active_conversation : ""}`}
                            onClick={() => handleSelectConversation(item)}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04, duration: 0.2 }}
                        >
                            {/* <div className={styles.avatar_wrapper}>
                                <img src={toAbsUrl(item.display_avatar) ?? "/5.png"} alt="avatar" className={styles.avatar} />
                                {item.type === "private" && <span className={styles.online_dot}></span>}
                            </div> */}
                            <div className={styles.avatar_wrapper}>
                                <img
                                    src={toAbsUrl(item.display_avatar) ?? "/5.png"}
                                    alt="avatar"
                                    className={styles.avatar}
                                />
                                {item.type === "private" && <span className={styles.online_dot}></span>}
                                {item.type === "group" && (
                                    <span className={styles.member_count_badge}>
                                        {item.members?.length ?? 0}
                                    </span>
                                )}
                            </div>
                            <div className={styles.conversation_content}>
                                <div className={styles.conversation_top}>
                                    <h4>{item.display_name}</h4>
                                    <span>{item.last_message ? formatTime(item.last_message.created_at) : ""}</span>
                                </div>
                                <div className={styles.conversation_bottom}>
                                    <p>{item.last_message?.content ?? "Chưa có tin nhắn"}</p>
                                    {item.unread_count > 0 && (
                                        <div className={styles.unread_badge}>{item.unread_count}</div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* ── CHAT PANEL ── */}
            <div className={styles.chat_panel}>
                {!activeConversation ? (
                    <div className={styles.empty_chat}>
                        <RiMessage3Fill />
                        <p>Chọn một cuộc trò chuyện để bắt đầu</p>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className={styles.chat_header}>
                            <div className={styles.chat_user}>
                                <div className={styles.avatar_wrapper}>
                                    <img src={activeConversation.display_avatar ?? "/5.png"} alt="avatar" className={styles.avatar} />
                                    {activeConversation.type === "private" && <span className={styles.online_dot}></span>}
                                </div>
                                <div>
                                    <h3>{activeConversation.display_name}</h3>
                                    <span className={styles.status_text}>
                                        {activeConversation.type === "group"
                                            ? `${activeConversation.members?.length ?? 0} thành viên`
                                            : "Đang hoạt động"}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.header_actions}>
                                {pinnedMessages.length > 0 && (
                                    <button
                                        className={`${styles.header_icon_button} ${showPinned ? styles.active_icon : ""}`}
                                        onClick={() => setShowPinned(v => !v)}
                                        title={`${pinnedMessages.length} tin nhắn đã ghim`}
                                    >
                                        <RiPushpin2Line />
                                        <span className={styles.pin_count}>{pinnedMessages.length}</span>
                                    </button>
                                )}
                                <button className={styles.header_icon_button}><RiMore2Fill /></button>
                            </div>
                        </div>

                        {/* Pinned Messages Panel */}
                        <AnimatePresence>
                            {showPinned && pinnedMessages.length > 0 && (
                                <motion.div
                                    className={styles.pinned_panel}
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className={styles.pinned_header}>
                                        <RiPushpin2Line />
                                        <span>Tin nhắn đã ghim ({pinnedMessages.length})</span>
                                        <button onClick={() => setShowPinned(false)}><RiCloseLine /></button>
                                    </div>
                                    {pinnedMessages.map(msg => (
                                        <div key={msg.id} className={styles.pinned_item} onClick={() => scrollToMessage(msg.id)}>
                                            <span className={styles.pinned_sender}>{msg.sender_name}</span>
                                            <span className={styles.pinned_content}>{msg.content}</span>
                                            <button
                                                className={styles.pinned_unpin_btn}
                                                title="Bỏ ghim"
                                                onClick={e => { e.stopPropagation(); handlePin(msg); }}
                                            >
                                                <RiPushpinLine />
                                            </button>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Messages */}
                        <div className={styles.message_list}>
                            {loadingMsgs ? (
                                <div className={styles.loading_state}><RiLoader4Line className={styles.spinner} /></div>
                            ) : (
                                <AnimatePresence initial={false}>
                                    {groupedMessages.map((item, idx) => {
                                        if (item.type === "date") {
                                            return (
                                                <div key={`date-${idx}`} className={styles.date_divider}>
                                                    <span>{item.label}</span>
                                                </div>
                                            );
                                        }
                                        const message = item.data;
                                        const isMe = String(message.sender_id) === String(currentUserId);
                                        const msgReactions = reactions[message.id] ?? [];

                                        return (
                                            <motion.div
                                                key={message.uuid ?? message.id}
                                                ref={el => { if (el) messageRefs.current[message.id] = el; }}
                                                className={`${styles.message_row} ${isMe ? styles.my_message : styles.other_message}`}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.15 }}
                                                onMouseEnter={() => setHoveredMsg(message.id)}
                                                onMouseLeave={() => {
                                                    setHoveredMsg(null);
                                                }}
                                            >
                                                {!isMe && (
                                                    <img
                                                        src={toAbsUrl(message.sender_avatar) ?? "/5.png"}
                                                        alt={message.sender_name}
                                                        className={styles.message_avatar}
                                                    />
                                                )}

                                                <div className={styles.message_bubble_wrapper}>
                                                    {!isMe && activeConversation.type === "group" && (
                                                        <span className={styles.sender_name}>{message.sender_name}</span>
                                                    )}

                                                    {/* Reply preview */}
                                                    {message.reply_to_data && (
                                                        <div className={styles.reply_preview}>
                                                            <span className={styles.reply_sender}>{message.reply_to_data.sender_name}</span>
                                                            <span className={styles.reply_text}>{message.reply_to_data.content}</span>
                                                        </div>
                                                    )}

                                                    {/* Bubble */}
                                                    <div className={`${styles.message_bubble} ${message.is_deleted ? styles.recalled_bubble : ""} ${message.is_pinned ? styles.pinned_bubble : ""}`}>
                                                        {message.type === "image" ? (
                                                            <img src={message.file_url} alt="img" className={styles.msg_image} />
                                                        ) : message.type === "file" ? (
                                                            <a href={message.file_url} target="_blank" rel="noreferrer" className={styles.file_msg}>
                                                                <RiFile3Line />
                                                                <span>{message.file_name ?? "File"}</span>
                                                            </a>
                                                        ) : (
                                                            message.content
                                                        )}
                                                        {message.is_pinned && (
                                                            <span className={styles.pin_indicator}><RiPushpin2Line /></span>
                                                        )}
                                                    </div>

                                                    {/* Reactions */}
                                                    {msgReactions.length > 0 && (
                                                        <div className={styles.reactions_row}>
                                                            {msgReactions.map(r => (
                                                                <button
                                                                    key={r.emoji}
                                                                    className={`${styles.reaction_chip} ${r.users.includes(currentUserId) ? styles.my_reaction : ""}`}
                                                                    onClick={() => handleReaction(message.id, r.emoji)}
                                                                >
                                                                    {r.emoji} {r.users.length}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    

                                                    <div className={styles.message_meta}>
                                                        <span>{formatTime(message.created_at)}</span>
                                                        {isMe && !message.is_deleted && (
                                                            <span className={styles.seen_status}><RiCheckDoubleFill /></span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Hover Actions */}
                                                <AnimatePresence>
                                                    {hoveredMsg === message.id && !message.is_deleted && (
                                                        <motion.div
                                                            className={`${styles.message_actions} ${isMe ? styles.actions_left : styles.actions_right}`}
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            transition={{ duration: 0.1 }}
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            <button
                                                                title="Emoji"
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    setShowEmojiPicker(p => p === message.id ? null : message.id);
                                                                    setShowMsgMenu(null);
                                                                }}
                                                            >
                                                                <RiEmotionHappyLine />
                                                            </button>
                                                            <button title="Trả lời" onClick={() => setReplyTo({ id: message.id, content: message.content, sender_name: message.sender_name })}>
                                                                <RiReplyLine />
                                                            </button>
                                                            <button
                                                                title="Thêm"
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    setShowMsgMenu(p => p === message.id ? null : message.id);
                                                                    setShowEmojiPicker(null);
                                                                }}
                                                            >
                                                                <RiMore2Fill />
                                                            </button>

                                                            {/* Emoji picker */}
                                                            <AnimatePresence>
                                                                {showEmojiPicker === message.id && (
                                                                    <motion.div
                                                                        className={`${styles.emoji_picker} ${isMe ? styles.picker_left : styles.picker_right}`}
                                                                        initial={{ opacity: 0, y: 6 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: 6 }}
                                                                        onClick={e => e.stopPropagation()}
                                                                    >
                                                                        {EMOJI_LIST.map(e => (
                                                                            <button key={e} onClick={() => handleReaction(message.id, e)}>{e}</button>
                                                                        ))}
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>

                                                            {/* Message menu */}
                                                            <AnimatePresence>
                                                                {showMsgMenu === message.id && (
                                                                    <motion.div
                                                                        className={`${styles.msg_menu} ${isMe ? styles.menu_left : styles.menu_right}`}
                                                                        initial={{ opacity: 0, y: 6 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: 6 }}
                                                                        onClick={e => e.stopPropagation()}
                                                                    >
                                                                        <button onClick={() => handlePin(message)}>
                                                                            {message.is_pinned ? <RiPushpinLine /> : <RiPushpin2Line />}
                                                                            {message.is_pinned ? "Bỏ ghim" : "Ghim tin nhắn"}
                                                                        </button>
                                                                        <button onClick={() => { setReplyTo({ id: message.id, content: message.content, sender_name: message.sender_name }); setShowMsgMenu(null); }}>
                                                                            <RiReplyLine /> Trả lời
                                                                        </button>
                                                                        <button onClick={() => { navigator.clipboard.writeText(message.content); setShowMsgMenu(null); }}>
                                                                            <RiShareForwardLine /> Sao chép
                                                                        </button>
                                                                        {canRecall(message) && (
                                                                            <button
                                                                                className={styles.danger_btn}
                                                                                onClick={() => { setRecallConfirm(message.id); setShowMsgMenu(null); }}
                                                                            >
                                                                                <RiArrowGoBackLine /> Thu hồi
                                                                            </button>
                                                                        )}
                                                                        {!canRecall(message) && isMe && (
                                                                            <div className={styles.recall_expired}>
                                                                                <RiTimeLine /> Hết hạn thu hồi
                                                                            </div>
                                                                        )}
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            )}
                            <div ref={messageEndRef} />
                        </div>

                        {/* Reply bar */}
                        <AnimatePresence>
                            {replyTo && (
                                <motion.div
                                    className={styles.reply_bar}
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                >
                                    <RiReplyLine className={styles.reply_icon} />
                                    <div className={styles.reply_info}>
                                        <span className={styles.reply_to_name}>{replyTo.sender_name}</span>
                                        <span className={styles.reply_to_text}>{replyTo.content}</span>
                                    </div>
                                    <button className={styles.reply_close} onClick={() => setReplyTo(null)}>
                                        <RiCloseLine />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Input */}
                        <div className={styles.message_input_container}>
                            <div className={styles.input_actions}>
                                <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={e => handleFileSend(e, "file")} />
                                <input type="file" ref={imageInputRef} style={{ display: "none" }} accept="image/*" onChange={e => handleFileSend(e, "image")} />
                                <button title="Đính kèm file" onClick={() => fileInputRef.current?.click()}>
                                    <RiAttachment2 />
                                </button>
                                <button title="Gửi ảnh" onClick={() => imageInputRef.current?.click()}>
                                    <RiImage2Fill />
                                </button>
                                <button title="Emoji" onClick={e => { e.stopPropagation(); setShowEmojiPicker(p => p === "input" ? null : "input"); }}>
                                    <RiEmotionHappyLine />
                                </button>
                            </div>

                            {/* Input emoji picker */}
                            <AnimatePresence>
                                {showEmojiPicker === "input" && (
                                    <motion.div
                                        className={styles.input_emoji_picker}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 8 }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {EMOJI_LIST.map(e => (
                                            <button key={e} onClick={() => { setMessageValue(v => v + e); setShowEmojiPicker(null); }}>{e}</button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <textarea
                                placeholder="Nhập tin nhắn..."
                                value={messageValue}
                                onChange={e => setMessageValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={1}
                            />

                            <button
                                className={`${styles.send_button} ${messageValue.trim() && connectionStatus === "connected" ? styles.send_active : ""}`}
                                onClick={handleSendMessage}
                                disabled={!messageValue.trim() || connectionStatus !== "connected"}
                            >
                                <RiSendPlaneFill />
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Recall confirm modal */}
            <AnimatePresence>
                {recallConfirm && (
                    <motion.div
                        className={styles.modal_overlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setRecallConfirm(null)}
                    >
                        <motion.div
                            className={styles.modal}
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h4>Thu hồi tin nhắn?</h4>
                            <p>Tin nhắn sẽ bị xóa với tất cả mọi người. Bạn có muốn tiếp tục?</p>
                            <div className={styles.modal_actions}>
                                <button className={styles.cancel_btn} onClick={() => setRecallConfirm(null)}>
                                    <RiCloseFill /> Hủy
                                </button>
                                <button className={styles.confirm_btn} onClick={() => handleRecall(recallConfirm)}>
                                    <RiCheckLine /> Thu hồi
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default Messages;
