// ProjectDetail2.jsx — Refactored: scroll XY, local time (+7), warning tasks, approve, member-scroll
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./ProjectDetail.module.css";
import { apiFetch } from "../utils/api";

// ─── Config ────────────────────────────────────────────────────────────────
const WS_BASE = import.meta.env.VITE_WS_BASE || "ws://localhost:8000";

function getToken() {
    return localStorage.getItem("access") || "";
}

// ─── Scale config (removed "hour") ────────────────────────────────────────
const SCALES = {
    day:   { label: "Ngày",  unit: "day",   totalUnits: 18, unitWidth: 56 },
    week:  { label: "Tuần",  unit: "week",  totalUnits: 8,  unitWidth: 88 },
    month: { label: "Tháng", unit: "month", totalUnits: 4,  unitWidth: 110 },
};

// ─── Timezone helpers (+7) ─────────────────────────────────────────────────
/** Parse any ISO string and return a Date adjusted to UTC+7 (no DST). */
function toLocal(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    // offset in ms to get UTC+7
    const utc7 = new Date(d.getTime() + 7 * 3600000);
    return utc7;
}

/** Format a UTC+7 Date as "HH:mm DD/MM/YYYY". */
function fmtLocal(dateStr) {
    if (!dateStr) return "—";
    const d = toLocal(dateStr);
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yy = d.getUTCFullYear();
    return `${hh}:${mm} ${dd}/${mo}/${yy}`;
}

/** Format only the date part (DD/MM) from local UTC+7 date. */
function fmtLocalShort(dateStr) {
    if (!dateStr) return "—";
    const d = toLocal(dateStr);
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${dd}/${mo}`;
}

/** Offset in days from baseDate (midnight UTC+7). */
function dateToOffset(dateStr, baseDate) {
    const d = toLocal(dateStr);
    // baseDate is already midnight local; treat it the same way
    const b = new Date(baseDate.getTime() + 7 * 3600000); // shift base to UTC+7
    return Math.round((d - b) / 86400000);
}

function offsetToDate(offset, baseDate) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + offset);
    return d;
}

function fmtISO(d) {
    // Returns local datetime-local string for form inputs
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? "+" : "-";
    const pad = n => String(Math.floor(Math.abs(n))).padStart(2, "0");
    return d.getFullYear() + "-" +
        pad(d.getMonth() + 1) + "-" +
        pad(d.getDate()) + "T" +
        pad(d.getHours()) + ":" +
        pad(d.getMinutes());
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function statusColor(status) {
    return {
        todo:       "#94a3b8",
        inprogress: "#3b82f6",
        in_review:  "#f59e0b",
        done:       "#22c55e",
        overdue:    "#ef4444",
        stuck:      "#f97316",
    }[status] || "#94a3b8";
}

function calcOffsetRange(project, baseDate, scale, scaleConfig) {
    if (!project?.start_date || !project?.end_date) {
        return { min: -365, max: 365 };
    }
    const startDay = dateToOffset(project.start_date, baseDate);
    const endDay   = dateToOffset(project.end_date,   baseDate);
    const daysPerUnit =
        scale === "week"  ? 7 :
        scale === "month" ? 30 : 1;
    const windowDays = daysPerUnit * scaleConfig.totalUnits;
    return {
        min: startDay,
        max: Math.max(startDay, endDay - windowDays + 1),
    };
}

function calcInitialOffset(project, baseDate, scale, scaleConfig) {
    const range = calcOffsetRange(project, baseDate, scale, scaleConfig);
    return clamp(0, range.min, range.max);
}

// ─── Icons ─────────────────────────────────────────────────────────────────
const Icon = {
    Back:        () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>),
    Edit:        () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>),
    Plus:        () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>),
    Users:       () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
    Message:     () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>),
    Close:       () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>),
    Search:      () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>),
    ChevronLeft: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>),
    ChevronRight:() => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>),
    Bell:        () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>),
    Trash:       () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>),
    Pin:         () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" /></svg>),
    Reply:       () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>),
    Check:       () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>),
    Send:        () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>),
    Expand:      () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>),
    Compress:    () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="10" y1="14" x2="3" y2="21" /><line x1="21" y1="3" x2="14" y2="10" /></svg>),
    Warning:     () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>),
    Calendar:    () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>),
    Filter:      () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>),
    UserCheck:   () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>),
    Assign:      () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><line x1="19" y1="8" x2="23" y2="8" /><line x1="21" y1="6" x2="21" y2="10" /></svg>),
    Clock:       () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>),
    ThumbsUp:    () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" /><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>),
    ThumbsDown:  () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" /><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" /></svg>),
    Target:      () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>),
};

// ─── Avatar ────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 34, round = false }) {
    const [err, setErr] = useState(false);
    const initials      = (name || "?").slice(0, 2).toUpperCase();
    const borderRadius  = round ? "50%" : 8;
    if (err || !src) {
        return (
            <div style={{
                width: size, height: size, borderRadius,
                background: "#e2e8f0", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: size * 0.35,
                fontWeight: 700, color: "#64748b", flexShrink: 0,
            }}>{initials}</div>
        );
    }
    return (
        <img src={src} alt={name}
            style={{ width: size, height: size, borderRadius, objectFit: "cover", flexShrink: 0 }}
            onError={() => setErr(true)}
        />
    );
}

// ─── Modal wrapper ─────────────────────────────────────────────────────────
function Modal({ open, onClose, title, icon, wide, ultraWide, children, footer }) {
    const overlayRef = useRef(null);
    return (
        <div
            ref={overlayRef}
            className={`${styles.modalOverlay} ${open ? styles.open : ""}`}
            onClick={e => { if (e.target === overlayRef.current) onClose(); }}
            role="dialog" aria-modal="true"
        >
            <div className={`${styles.modal} ${wide ? styles.modalWide : ""} ${ultraWide ? styles.modalUltraWide : ""}`}>
                <div className={styles.modalHeader}>
                    <h2>{icon}{title}</h2>
                    <button className={styles.modalClose} onClick={onClose}><Icon.Close /></button>
                </div>
                <div className={styles.modalBody}>{children}</div>
                {footer && <div className={styles.modalFooter}>{footer}</div>}
            </div>
        </div>
    );
}

// ─── Toast ─────────────────────────────────────────────────────────────────
function Toast({ message, show, type = "default" }) {
    const bg = type === "error" ? "#ef4444" : undefined;
    return (
        <div className={`${styles.toast} ${show ? styles.toastShow : ""}`} style={bg ? { background: bg } : {}}>
            <Icon.Check />{message}
        </div>
    );
}

// ─── Skill filter ──────────────────────────────────────────────────────────
function SkillFilter({ allSkills, selectedSkills, onChange }) {
    return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {allSkills.map(skill => {
                const active = selectedSkills.includes(skill);
                return (
                    <button key={skill}
                        onClick={() => onChange(active ? selectedSkills.filter(s => s !== skill) : [...selectedSkills, skill])}
                        style={{
                            padding: "3px 8px", borderRadius: 999,
                            border: `1px solid ${active ? "#6366f1" : "#dbe3ec"}`,
                            background: active ? "#eef2ff" : "white",
                            color: active ? "#4338ca" : "#64748b",
                            fontSize: 10, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                        }}
                    >{skill}</button>
                );
            })}
        </div>
    );
}

// ─── Warning Tasks Modal ───────────────────────────────────────────────────
function WarningTasksModal({ open, onClose, warningTasks, warningLoading }) {
    const priorityLabel = { 1: "Thấp", 2: "Trung bình", 3: "Cao", 4: "Khẩn" };
    const statusLabel = {
        todo: "Chưa làm", inprogress: "Đang làm",
        in_review: "Chờ duyệt", done: "Xong", overdue: "Trễ", stuck: "Kẹt",
    };
    return (
        <Modal open={open} onClose={onClose} title={`Cảnh báo task (${warningTasks.length})`} icon={<Icon.Warning />} wide>
            {warningLoading && (
                <div style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>Đang tải...</div>
            )}
            {!warningLoading && warningTasks.length === 0 && (
                <div style={{ textAlign: "center", padding: 30, color: "#22c55e", fontSize: 13 }}>
                    ✓ Không có task nào cần cảnh báo
                </div>
            )}
            {warningTasks.map(t => (
                <div key={t.uuid} style={{
                    padding: "12px 14px", borderRadius: 12,
                    border: "1px solid #fed7aa", background: "#fff7ed",
                    marginBottom: 8,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>{t.name}</span>
                        <span style={{
                            padding: "1px 6px", borderRadius: 999,
                            background: statusColor(t.status) + "22",
                            color: statusColor(t.status),
                            fontSize: 9, fontWeight: 700, border: `1px solid ${statusColor(t.status)}44`,
                        }}>{statusLabel[t.status] || t.status}</span>
                        {t.type === "leader" && (
                            <span style={{
                                padding: "1px 6px", borderRadius: 999,
                                background: "#e0e7ff", color: "#4338ca",
                                fontSize: 9, fontWeight: 700,
                            }}>Leader view</span>
                        )}
                    </div>
                    {t.warning_note && (
                        <div style={{
                            display: "flex", alignItems: "center", gap: 5,
                            fontSize: 11, color: "#c2410c", fontWeight: 600, marginBottom: 4,
                        }}>
                            <Icon.Warning />{t.warning_note}
                        </div>
                    )}
                    <div style={{ display: "flex", gap: 12, fontSize: 10, color: "#64748b" }}>
                        <span><Icon.Clock style={{ width: 10 }} /> {fmtLocal(t.start_date)} → {fmtLocal(t.end_date)}</span>
                        <span>Tiến độ: <strong style={{ color: "#0f172a" }}>{t.progress}%</strong></span>
                        {t.fullname && <span>Người thực hiện: <strong style={{ color: "#0f172a" }}>{t.fullname}</strong></span>}
                    </div>
                </div>
            ))}
        </Modal>
    );
}

// ─── Approve Tasks Modal ───────────────────────────────────────────────────
function ApproveTasksModal({ open, onClose, inReviewTasks, onApprove, onApproveAll, loading }) {
    return (
        <Modal
            open={open} onClose={onClose}
            title={`Duyệt task (${inReviewTasks.length})`} icon={<Icon.ThumbsUp />} wide
            footer={
                <>
                    <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>Đóng</button>
                    {inReviewTasks.length > 1 && (
                        <button
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            onClick={onApproveAll} disabled={loading}
                            style={{ background: "#16a34a", borderColor: "#16a34a" }}
                        >
                            <Icon.Check /> Duyệt tất cả ({inReviewTasks.length})
                        </button>
                    )}
                </>
            }
        >
            {inReviewTasks.length === 0 && (
                <div style={{ textAlign: "center", padding: 30, color: "#94a3b8", fontSize: 13 }}>
                    Không có task nào chờ duyệt
                </div>
            )}
            {inReviewTasks.map(t => (
                <div key={t.uuid} style={{
                    padding: "12px 14px", borderRadius: 12,
                    border: "1px solid #fde68a", background: "#fffbeb",
                    marginBottom: 8, display: "flex", alignItems: "center", gap: 10,
                }}>
                    <Avatar src={t.avatarpath} name={t.fullname} size={36} round />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: "#0f172a", marginBottom: 2 }}>{t.name}</div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>
                            {t.fullname && <span>{t.fullname} · </span>}
                            {fmtLocal(t.start_date)} → {fmtLocal(t.end_date)}
                        </div>
                        <div style={{ marginTop: 3, fontSize: 10, color: "#d97706", fontWeight: 600 }}>
                            Tiến độ: {t.progress}% · Đang chờ duyệt
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                        <button
                            style={{
                                height: 30, padding: "0 12px", borderRadius: 7, fontSize: 10, fontWeight: 700,
                                background: "#dcfce7", color: "#16a34a", border: "1px solid #86efac",
                                cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                            }}
                            onClick={() => onApprove(t.uuid, true)} disabled={loading}
                        >
                            <Icon.ThumbsUp /> Duyệt
                        </button>
                        <button
                            style={{
                                height: 30, padding: "0 12px", borderRadius: 7, fontSize: 10, fontWeight: 700,
                                background: "#fee2e2", color: "#ef4444", border: "1px solid #fca5a5",
                                cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                            }}
                            onClick={() => onApprove(t.uuid, false)} disabled={loading}
                        >
                            <Icon.ThumbsDown /> Từ chối
                        </button>
                    </div>
                </div>
            ))}
        </Modal>
    );
}

// ─── Edit Project Modal ────────────────────────────────────────────────────
function EditProjectModal({ open, onClose, project, onSave, loading }) {
    const [form, setForm] = useState({ name: "", description: "", start_date: "", end_date: "" });

    useEffect(() => {
        if (project && open) {
            setForm({
                name:        project.name        || "",
                description: project.description || "",
                start_date:  project.start_date  ? fmtISO(new Date(project.start_date)) : "",
                end_date:    project.end_date    ? fmtISO(new Date(project.end_date))   : "",
            });
        }
    }, [project, open]);

    if (!project) return null;
    const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

    const handleSave = () => {
        const payload = {};
        if (form.name !== project.name)               payload.name        = form.name;
        if (form.description !== project.description) payload.description = form.description;
        if (form.start_date) payload.start_date = new Date(form.start_date).toISOString();
        if (form.end_date)   payload.end_date   = new Date(form.end_date).toISOString();
        if (Object.keys(payload).length === 0) { onClose(); return; }
        onSave(payload);
    };

    return (
        <Modal open={open} onClose={onClose} title="Chỉnh sửa dự án" icon={<Icon.Edit />}
            footer={
                <>
                    <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>Hủy</button>
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={loading}>
                        {loading ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                </>
            }
        >
            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tên dự án</label>
                <input className={styles.formInput} value={form.name} onChange={set("name")} />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Mô tả</label>
                <textarea className={styles.formTextarea} value={form.description} onChange={set("description")} rows={3} />
            </div>
            <div className={styles.formRow}>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Ngày bắt đầu</label>
                    <input className={styles.formInput} type="datetime-local" value={form.start_date} onChange={set("start_date")} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Ngày kết thúc</label>
                    <input className={styles.formInput} type="datetime-local" value={form.end_date} onChange={set("end_date")} />
                </div>
            </div>
        </Modal>
    );
}

// ─── Create Task Modal ─────────────────────────────────────────────────────
function CreateTaskModal({ open, onClose, projectMembers, onSave, loading }) {
    const [form, setForm] = useState({
        name: "", start_date: "", end_date: "",
        difficulty: 2, priority: "medium", note: "",
    });
    const [search, setSearch]           = useState("");
    const [skillFilter, setSkillFilter] = useState([]);
    const [assignments, setAssignments] = useState({});

    useEffect(() => {
        if (!open) {
            setForm({ name: "", start_date: "", end_date: "", difficulty: 2, priority: "medium", note: "" });
            setAssignments({});
            setSearch("");
            setSkillFilter([]);
        }
    }, [open]);

    const allSkills = useMemo(() => {
        const set = new Set();
        projectMembers.forEach(m => (m.skills || []).forEach(s => set.add(s.name)));
        return [...set].sort();
    }, [projectMembers]);

    const filteredMembers = useMemo(() =>
        projectMembers.filter(m => {
            const matchSearch = !search ||
                (m.fullname || "").toLowerCase().includes(search.toLowerCase()) ||
                (m.username || "").toLowerCase().includes(search.toLowerCase());
            const matchSkill = skillFilter.length === 0 ||
                skillFilter.every(sk => (m.skills || []).some(s => s.name === sk));
            return matchSearch && matchSkill;
        }), [projectMembers, search, skillFilter]);

    const assignedCount = Object.values(assignments).filter(a => a.assigned).length;

    const toggleAssign = (member) => {
        setAssignments(prev => ({
            ...prev,
            [member.userproject_uuid]: {
                member,
                assigned: !prev[member.userproject_uuid]?.assigned,
            },
        }));
    };

    const handleSubmit = () => {
        if (!form.name.trim() || !form.start_date || !form.end_date) return;
        const assignedMembers = Object.values(assignments).filter(a => a.assigned).map(a => a.member);
        if (assignedMembers.length === 0) {
            onSave([{
                name:       form.name.trim(),
                start_date: new Date(form.start_date).toISOString(),
                end_date:   new Date(form.end_date).toISOString(),
                difficulty: Number(form.difficulty),
                priority:   form.priority,
                note:       form.note || undefined,
            }]);
            return;
        }
        const tasks = assignedMembers.map(m => ({
            name:        form.name.trim(),
            start_date:  new Date(form.start_date).toISOString(),
            end_date:    new Date(form.end_date).toISOString(),
            difficulty:  Number(form.difficulty),
            priority:    form.priority,
            note:        form.note || undefined,
            assigned_to: m.userproject_uuid,
        }));
        onSave(tasks);
    };

    const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
    const isValid = form.name.trim() && form.start_date && form.end_date;

    return (
        <Modal open={open} onClose={onClose} title="Tạo task mới" icon={<Icon.Plus />} ultraWide
            footer={
                <>
                    <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>Hủy</button>
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSubmit} disabled={loading || !isValid}>
                        {loading ? "Đang tạo..." : (
                            assignedCount > 0
                                ? <><Icon.UserCheck /> Bàn giao {assignedCount} thành viên</>
                                : <><Icon.Plus /> Tạo task (không bàn giao)</>
                        )}
                    </button>
                </>
            }
        >
            <div className={styles.splitLayout}>
                <div className={styles.splitLeft}>
                    <div style={{ fontWeight: 700, fontSize: 10, color: "#4a4a6a", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 12 }}>
                        Thông tin task
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Tên task *</label>
                        <input className={styles.formInput} value={form.name} onChange={set("name")} placeholder="Nhập tên công việc..." />
                    </div>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Ngày bắt đầu *</label>
                            <input className={styles.formInput} type="datetime-local" value={form.start_date} onChange={set("start_date")} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Deadline *</label>
                            <input className={styles.formInput} type="datetime-local" value={form.end_date} onChange={set("end_date")} />
                        </div>
                    </div>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Độ khó</label>
                            <select className={styles.formSelect} value={form.difficulty} onChange={set("difficulty")}>
                                <option value={1}>⚡ Very Easy</option>
                                <option value={2}>🔧 Easy</option>
                                <option value={3}>🔥 Medium</option>
                                <option value={4}>💀 Hard</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Độ ưu tiên</label>
                            <select className={styles.formSelect} value={form.priority} onChange={set("priority")}>
                                <option value="low">🟢 Low</option>
                                <option value="medium">🟡 Medium</option>
                                <option value="high">🟠 High</option>
                                <option value="critical">🔴 Critical</option>
                            </select>
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Ghi chú</label>
                        <textarea className={styles.formTextarea} value={form.note} onChange={set("note")} placeholder="Ghi chú thêm..." rows={3} />
                    </div>
                    {assignedCount > 0 && (
                        <div style={{ marginTop: 8, padding: "10px 12px", background: "#eef2ff", borderRadius: 10, border: "1px solid #c7d2fe" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#4338ca", marginBottom: 6 }}>
                                Đã chọn ({assignedCount})
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {Object.values(assignments).filter(a => a.assigned).map(({ member }) => (
                                    <div key={member.userproject_uuid} style={{
                                        display: "flex", alignItems: "center", gap: 4,
                                        padding: "3px 8px", background: "white",
                                        borderRadius: 999, border: "1px solid #c7d2fe",
                                        fontSize: 10, fontWeight: 600,
                                    }}>
                                        <Avatar src={member.avatarpath} name={member.fullname} size={16} round />
                                        {member.fullname}
                                        <button onClick={() => toggleAssign(member)}
                                            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, marginLeft: 2 }}>
                                            <Icon.Close />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className={styles.splitDivider} />
                <div className={styles.splitRight}>
                    <div style={{ fontWeight: 700, fontSize: 10, color: "#4a4a6a", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 12 }}>
                        Bàn giao cho thành viên
                    </div>
                    <div className={styles.searchBox} style={{ marginBottom: 8 }}>
                        <Icon.Search />
                        <input placeholder="Tìm thành viên..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    {allSkills.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                                Lọc theo kỹ năng
                            </div>
                            <SkillFilter allSkills={allSkills} selectedSkills={skillFilter} onChange={setSkillFilter} />
                        </div>
                    )}
                    <div style={{ flex: 1, overflowY: "auto", maxHeight: 340 }}>
                        {filteredMembers.length === 0 && (
                            <div style={{ padding: "16px 0", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                                Không tìm thấy thành viên
                            </div>
                        )}
                        {filteredMembers.map(m => {
                            const isAssigned = !!assignments[m.userproject_uuid]?.assigned;
                            return (
                                <div key={m.userproject_uuid} style={{
                                    display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                                    borderRadius: 8, border: `1px solid ${isAssigned ? "#c7d2fe" : "#e2e8f0"}`,
                                    background: isAssigned ? "#eef2ff" : "white", marginBottom: 6, transition: "all 0.15s",
                                }}>
                                    <Avatar src={m.avatarpath} name={m.fullname} size={32} round />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 11, color: "#0f172a" }}>{m.fullname}</div>
                                        <div style={{ fontSize: 9, color: "#94a3b8" }}>@{m.username}</div>
                                    </div>
                                    <button onClick={() => toggleAssign(m)} style={{
                                        height: 28, padding: "0 10px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                                        cursor: "pointer", transition: "all 0.15s",
                                        border: `1px solid ${isAssigned ? "#6366f1" : "#dbe3ec"}`,
                                        background: isAssigned ? "#4f46e5" : "white",
                                        color: isAssigned ? "white" : "#475569",
                                        display: "flex", alignItems: "center", gap: 4,
                                    }}>
                                        {isAssigned ? <><Icon.Check /> Đã chọn</> : <><Icon.Assign /> Bàn giao</>}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Modal>
    );
}

// ─── Edit Task Modal ───────────────────────────────────────────────────────
function EditTaskModal({ open, onClose, task, onSave, loading }) {
    const [form, setForm] = useState({ name: "", start_date: "", end_date: "" });

    useEffect(() => {
        if (task) {
            setForm({
                name:       task.name || "",
                start_date: task.start_date ? fmtISO(new Date(task.start_date)) : "",
                end_date:   task.end_date   ? fmtISO(new Date(task.end_date))   : "",
            });
        }
    }, [task]);

    if (!task) return null;
    const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

    const handleSave = () => {
        const payload = {};
        if (form.name !== task.name) payload.name = form.name;
        if (form.start_date) payload.start_date = new Date(form.start_date).toISOString();
        if (form.end_date)   payload.end_date   = new Date(form.end_date).toISOString();
        if (Object.keys(payload).length === 0) { onClose(); return; }
        onSave(task.uuid, payload);
    };

    return (
        <Modal open={open} onClose={onClose} title="Chỉnh sửa task" icon={<Icon.Edit />}
            footer={
                <>
                    <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>Hủy</button>
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={loading}>
                        {loading ? "Đang lưu..." : "Lưu"}
                    </button>
                </>
            }
        >
            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tên task</label>
                <input className={styles.formInput} value={form.name} onChange={set("name")} />
            </div>
            <div className={styles.formRow}>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Bắt đầu</label>
                    <input className={styles.formInput} type="datetime-local" value={form.start_date} onChange={set("start_date")} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Kết thúc</label>
                    <input className={styles.formInput} type="datetime-local" value={form.end_date} onChange={set("end_date")} />
                </div>
            </div>
        </Modal>
    );
}

// ─── Members Modal ─────────────────────────────────────────────────────────
function MembersModal({ open, onClose, project, onKick, onAdd, loading }) {
    const projectMembers = project?.project_members || [];
    const groupMembers   = project?.group_members   || [];
    const inProjectIds   = new Set(projectMembers.map(m => m.user_id));
    const outsiders      = groupMembers.filter(m => !inProjectIds.has(m.user_id));
    const [search, setSearch]           = useState("");
    const [skillFilter, setSkillFilter] = useState([]);

    const allSkills = useMemo(() => {
        const set = new Set();
        outsiders.forEach(m => (m.skills || []).forEach(s => set.add(s.name)));
        return [...set].sort();
    }, [outsiders]);

    const filteredOutsiders = useMemo(() =>
        outsiders.filter(m => {
            const matchSearch = !search ||
                (m.fullname || "").toLowerCase().includes(search.toLowerCase()) ||
                (m.username || "").toLowerCase().includes(search.toLowerCase());
            const matchSkill = skillFilter.length === 0 ||
                skillFilter.every(sk => (m.skills || []).some(s => s.name === sk));
            return matchSearch && matchSkill;
        }), [outsiders, search, skillFilter]);

    return (
        <Modal open={open} onClose={onClose} title="Quản lý thành viên" icon={<Icon.Users />} ultraWide
            footer={<button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>Đóng</button>}
        >
            <div className={styles.splitLayout}>
                <div className={styles.splitLeft}>
                    <div style={{ fontWeight: 700, fontSize: 10, color: "#4a4a6a", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 12 }}>
                        Thêm thành viên ({outsiders.length})
                    </div>
                    {project?.is_creator && outsiders.length > 0 ? (
                        <>
                            <div className={styles.searchBox} style={{ marginBottom: 8 }}>
                                <Icon.Search />
                                <input placeholder="Tìm thành viên nhóm..." value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                            {allSkills.length > 0 && (
                                <div style={{ marginBottom: 8 }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Lọc kỹ năng</div>
                                    <SkillFilter allSkills={allSkills} selectedSkills={skillFilter} onChange={setSkillFilter} />
                                </div>
                            )}
                            <div style={{ overflowY: "auto", maxHeight: 380 }}>
                                {filteredOutsiders.length === 0 && (
                                    <div style={{ padding: "16px 0", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>Không tìm thấy thành viên</div>
                                )}
                                {filteredOutsiders.map(m => (
                                    <div key={m.userprofile_uuid} className={styles.memberListItem}>
                                        <Avatar src={m.avatarpath} name={m.fullname} size={40} round />
                                        <div className={styles.mliBody}>
                                            <div className={styles.mliName}>{m.fullname}</div>
                                            <div className={styles.mliRole}>@{m.username}</div>
                                            <div className={styles.skillTags}>
                                                {(m.skills || []).map(s => (
                                                    <span key={s.uuid} style={{
                                                        padding: "1px 6px", borderRadius: 999, fontSize: 8, fontWeight: 700,
                                                        background: skillFilter.includes(s.name) ? "#dbeafe" : "#f1f5f9",
                                                        color: skillFilter.includes(s.name) ? "#2563eb" : "#475569",
                                                    }}>{s.name}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <button className={`${styles.btn} ${styles.btnPrimary}`}
                                            style={{ height: 28, padding: "0 10px", fontSize: 10 }}
                                            onClick={() => onAdd(m.userprofile_uuid)} disabled={loading}>
                                            <Icon.Plus /> Thêm
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                            {project?.is_creator ? "Tất cả thành viên nhóm đã tham gia" : "Không có quyền thêm thành viên"}
                        </div>
                    )}
                </div>
                <div className={styles.splitDivider} />
                <div className={styles.splitRight}>
                    <div style={{ fontWeight: 700, fontSize: 10, color: "#4a4a6a", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 12 }}>
                        Trong dự án ({projectMembers.length})
                    </div>
                    <div style={{ overflowY: "auto", maxHeight: 460 }}>
                        {projectMembers.map(m => (
                            <div key={m.userproject_uuid} className={styles.memberListItem}>
                                <Avatar src={m.avatarpath} name={m.fullname} size={40} round />
                                <div className={styles.mliBody}>
                                    <div className={styles.mliName}>{m.fullname}</div>
                                    <div className={styles.mliRole}>@{m.username} · {m.user_code}</div>
                                    <div className={styles.skillTags}>
                                        {(m.skills || []).map(s => (
                                            <span key={s.uuid} className={styles.skillTag}>{s.name}</span>
                                        ))}
                                    </div>
                                </div>
                                {project?.is_creator && (
                                    <button
                                        style={{
                                            height: 28, padding: "0 10px", fontSize: 10,
                                            background: "#fee2e2", color: "#ef4444",
                                            border: "1px solid #fca5a5", borderRadius: 6,
                                            cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                                        }}
                                        onClick={() => onKick(m.userproject_uuid)} disabled={loading}>
                                        <Icon.Trash /> Kick
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
}

// ─── Comments Modal ────────────────────────────────────────────────────────
function CommentsModal({ open, onClose, comments, projectUuid, isCreator, onRefresh, loading }) {
    const [text, setText]     = useState("");
    const [replyTo, setReplyTo] = useState(null);
    const [sending, setSending] = useState(false);

    const handleAdd = async () => {
        if (!text.trim() || sending) return;
        setSending(true);
        try {
            await apiFetch(`/comments/${projectUuid}/`, {
                method: "POST",
                body:   JSON.stringify({ content: text.trim(), parent_uuid: replyTo?.uuid || undefined }),
            });
            setText(""); setReplyTo(null); onRefresh();
        } catch (e) { alert(e.message); }
        finally { setSending(false); }
    };

    const handleDelete = async (uuid) => {
        if (!window.confirm("Xóa bình luận này?")) return;
        try {
            await apiFetch(`/comments/detail/${uuid}/`, { method: "DELETE" });
            onRefresh();
        } catch (e) { alert(e.message); }
    };

    const handlePin = async (uuid) => {
        try {
            await apiFetch(`/comments/pin/${uuid}/`, { method: "POST" });
            onRefresh();
        } catch (e) { alert(e.message); }
    };

    const sorted = [...comments].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    return (
        <Modal open={open} onClose={onClose} title="Bình luận dự án" icon={<Icon.Message />} wide
            footer={
                <div style={{ padding: 0, border: "none", width: "100%" }}>
                    {replyTo && (
                        <div style={{ fontSize: 11, color: "#6366f1", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                            <Icon.Reply /> Reply <strong>{replyTo.author}</strong>
                            <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 4 }}><Icon.Close /></button>
                        </div>
                    )}
                    <div style={{ display: "flex", gap: 8, width: "100%" }}>
                        <input
                            placeholder={replyTo ? `Reply ${replyTo.author}...` : "Nhập bình luận..."}
                            value={text}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleAdd()}
                            style={{ flex: 1 }}
                        />
                        <button className={styles.commentSendBtn} onClick={handleAdd} disabled={sending}>
                            <Icon.Send /> {sending ? "..." : "Gửi"}
                        </button>
                    </div>
                </div>
            }
        >
            {loading && <div style={{ textAlign: "center", padding: 20, color: "#94a3b8" }}>Đang tải...</div>}
            {!loading && sorted.length === 0 && (
                <div style={{ textAlign: "center", padding: 20, color: "#94a3b8", fontSize: 13 }}>Chưa có bình luận nào</div>
            )}
            {sorted.map(c => (
                <div key={c.uuid} className={`${styles.commentItem} ${c.pinned ? styles.commentItemPinned : ""}`}>
                    {c.pinned && <div className={styles.pinnedBadge}><Icon.Pin /> Đã ghim</div>}
                    <div className={styles.commentHeader}>
                        <Avatar src={c.avatarpath} name={c.fullname || c.author} size={28} round />
                        <span className={styles.commentAuthor}>{c.fullname || c.author}</span>
                        <span className={styles.commentTime}>
                            {new Date(c.created_at).toLocaleString("vi-VN")}{c.is_edited && " (đã sửa)"}
                        </span>
                    </div>
                    <div className={styles.commentText}>{c.content}</div>
                    {(c.replies || []).map(r => (
                        <div key={r.uuid} className={styles.replyIndent}>
                            <div className={styles.replyHeader}>
                                <Avatar src={r.avatarpath} name={r.fullname || r.author} size={22} round />
                                <span className={styles.replyAuthor}>{r.fullname || r.author}</span>
                            </div>
                            <div className={styles.replyText}>{r.content}</div>
                        </div>
                    ))}
                    <div className={styles.commentActionsRow}>
                        {isCreator && (
                            <button className={`${styles.commentActBtn} ${c.pinned ? styles.commentActBtnActive : ""}`} onClick={() => handlePin(c.uuid)}>
                                <Icon.Pin />
                            </button>
                        )}
                        <button className={styles.commentActBtn} onClick={() => setReplyTo({ uuid: c.uuid, author: c.fullname || c.author })}>
                            <Icon.Reply />
                        </button>
                        {(c.is_mine || isCreator) && (
                            <button className={`${styles.commentActBtn} ${styles.commentActBtnDanger}`} onClick={() => handleDelete(c.uuid)}>
                                <Icon.Trash />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </Modal>
    );
}

// ─── Task Tooltip ──────────────────────────────────────────────────────────
function TaskTooltip({ task, member, visible, x, y }) {
    if (!visible || !task) return null;
    const statusLabel = {
        todo: "Chưa làm", inprogress: "Đang làm",
        in_review: "Chờ duyệt", done: "Xong",
        overdue: "Trễ hạn", stuck: "Kẹt",
    };
    const color = statusColor(task.status);
    return (
        <div style={{
            position: "fixed",
            left: x + 14, top: y - 10,
            zIndex: 1000,
            background: "white",
            border: `1.5px solid ${color}55`,
            borderRadius: 10,
            padding: "10px 13px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
            minWidth: 200,
            maxWidth: 280,
            pointerEvents: "none",
        }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#0f172a", marginBottom: 5 }}>{task.name}</div>
            <div style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "2px 7px", borderRadius: 999, marginBottom: 6,
                background: color + "18", border: `1px solid ${color}44`,
                fontSize: 9, fontWeight: 700, color,
            }}>
                {statusLabel[task.status] || task.status}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#475569" }}>
                    <span style={{ color: "#94a3b8", fontSize: 9 }}>▶ Bắt đầu:</span>
                    <strong>{fmtLocal(task.start_date)}</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#475569" }}>
                    <span style={{ color: "#94a3b8", fontSize: 9 }}>⏹ Deadline:</span>
                    <strong>{fmtLocal(task.end_date)}</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#475569" }}>
                    <span style={{ color: "#94a3b8", fontSize: 9 }}>📊 Tiến độ:</span>
                    <strong>{task.progress}%</strong>
                </div>
                {member?.fullname && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#475569" }}>
                        <span style={{ color: "#94a3b8", fontSize: 9 }}>👤 Người thực hiện:</span>
                        <strong>{member.fullname}</strong>
                    </div>
                )}
            </div>
            <div style={{ marginTop: 6, height: 4, borderRadius: 999, background: "#f1f5f9", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${task.progress}%`, background: color, borderRadius: 999 }} />
            </div>
        </div>
    );
}

// ─── Gantt Row ─────────────────────────────────────────────────────────────
function GanttRow({ member, tasks, viewOffset, totalUnits, scale, baseDate, onEdit, onDelete, onRemind, isCreator, rowRef, onTaskHover }) {
    const barHeight = 28;
    const rowPad    = 8;
    const rowH      = Math.max(barHeight + rowPad * 2, tasks.length * (barHeight + 6) + rowPad);

    const daysPerUnit = scale === "week" ? 7 : scale === "month" ? 30 : 1;
    const windowDays  = totalUnits * daysPerUnit;

    return (
        <tr className={styles.ganttRow} ref={rowRef}>
            <td className={styles.memberCell}>
                <Avatar src={member.avatarpath} name={member.fullname} size={36} round />
                <div className={styles.memberInfo}>
                    <div className={styles.mName}>{member.fullname}</div>
                    <div className={styles.mRole}>@{member.username}</div>
                </div>
            </td>
            <td className={styles.dayCell} colSpan={totalUnits} style={{ padding: 0, height: rowH }}>
                <div style={{ position: "relative", height: rowH }}>
                    {tasks.map((task, ti) => {
                        const taskStartOff = dateToOffset(task.start_date, baseDate);
                        const taskEndOff   = dateToOffset(task.end_date,   baseDate);
                        const durDays      = Math.max(1, taskEndOff - taskStartOff);

                        let leftFrac, widthFrac;
                        if (scale === "week") {
                            leftFrac  = (taskStartOff - viewOffset * 7) / windowDays;
                            widthFrac = durDays / windowDays;
                        } else if (scale === "month") {
                            leftFrac  = (taskStartOff - viewOffset * 30) / windowDays;
                            widthFrac = durDays / windowDays;
                        } else {
                            leftFrac  = (taskStartOff - viewOffset) / totalUnits;
                            widthFrac = durDays / totalUnits;
                        }

                        const leftPct  = leftFrac  * 100;
                        const widthPct = widthFrac * 100;
                        const top      = rowPad + ti * (barHeight + 6);
                        const color    = statusColor(task.status);

                        const isWarning = (() => {
                            if (task.status === "done") return false;
                            const now   = Date.now();
                            const start = new Date(task.start_date).getTime();
                            const end   = new Date(task.end_date).getTime();
                            const total = end - start;
                            if (total <= 0) return false;
                            const ratio = 1 - (now - start) / total;
                            return ratio <= 0.1 || (ratio <= 0.5 && task.status === "todo");
                        })();

                        if (leftPct + widthPct < 0 || leftPct > 100) return null;

                        return (
                            <div
                                key={task.uuid}
                                className={styles.ganttBar}
                                style={{
                                    left:    `${Math.max(0, leftPct)}%`,
                                    width:   `${Math.min(100 - Math.max(0, leftPct), widthPct)}%`,
                                    top,
                                    background: `${color}22`,
                                    border:  `1.5px solid ${color}`,
                                    outline: isWarning ? `2px solid #f59e0b` : "none",
                                    minWidth: 36,
                                }}
                                onClick={() => onEdit(task)}
                                onMouseEnter={e => onTaskHover(task, member, e)}
                                onMouseMove={e => onTaskHover(task, member, e)}
                                onMouseLeave={() => onTaskHover(null, null, null)}
                                title=""
                            >
                                <Avatar src={member.avatarpath} name={member.fullname} size={20} round />
                                <span className={styles.barName} style={{ color }}>{task.name}</span>
                                <span className={styles.barPct}  style={{ color }}>{task.progress}%</span>
                                {isWarning && (
                                    <span style={{ color: "#f59e0b", marginLeft: 2 }}><Icon.Warning /></span>
                                )}
                                <div className={styles.barProgress}>
                                    <div className={styles.barProgressFill} style={{ width: `${task.progress}%`, background: color }} />
                                </div>
                                {isCreator && (
                                    <div className={styles.taskActions}>
                                        <button className={styles.taskActBtn} title="Nhắc nhở"
                                            onClick={e => { e.stopPropagation(); onRemind(task); }}>
                                            <Icon.Bell />
                                        </button>
                                        <button className={styles.taskActBtn} title="Chỉnh sửa"
                                            onClick={e => { e.stopPropagation(); onEdit(task); }}>
                                            <Icon.Edit />
                                        </button>
                                        <button className={styles.taskActBtn} title="Xóa"
                                            onClick={e => { e.stopPropagation(); onDelete(task.uuid); }}>
                                            <Icon.Trash />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </td>
        </tr>
    );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function ProjectDetail() {
    const navigate = useNavigate();
    const { uuid } = useParams();

    const [project,    setProject   ] = useState(null);
    const [comments,   setComments  ] = useState([]);
    const [loading,    setLoading   ] = useState(true);
    const [apiLoading, setApiLoading] = useState(false);

    const [search,   setSearch  ] = useState("");
    const [filter,   setFilter  ] = useState("all");
    const [scale,    setScale   ] = useState("day");
    const [expanded, setExpanded] = useState(false);

    const [viewOffset, setViewOffset] = useState(null);

    // Warning tasks state
    const [warningTasks,   setWarningTasks  ] = useState([]);
    const [warningLoading, setWarningLoading] = useState(false);

    const [modal, setModal] = useState({
        createTask: false, editTask: false, members: false,
        comments: false, editProject: false,
        warning: false, approve: false,
    });
    const [editingTask, setEditingTask] = useState(null);

    const [toast, setToast] = useState({ show: false, msg: "", type: "default" });
    const showToast = useCallback((msg, type = "default") => {
        setToast({ show: true, msg, type });
        setTimeout(() => setToast({ show: false, msg: "", type: "default" }), 2800);
    }, []);

    // Tooltip state
    const [tooltip, setTooltip] = useState({ task: null, member: null, x: 0, y: 0, visible: false });

    // Refs for member row scroll
    const memberRowRefs = useRef({});   // { [userproject_uuid]: ref }
    const ganttScrollRef = useRef(null);

    const baseDate = useMemo(() => {
        const d = new Date(); d.setHours(0, 0, 0, 0); return d;
    }, []);

    const scaleConfig = SCALES[scale];

    const offsetRange = useMemo(
        () => calcOffsetRange(project, baseDate, scale, scaleConfig),
        [project, baseDate, scale, scaleConfig]
    );

    useEffect(() => {
        if (!project) return;
        setViewOffset(prev => {
            if (prev === null) return calcInitialOffset(project, baseDate, scale, scaleConfig);
            return clamp(prev, offsetRange.min, offsetRange.max);
        });
    }, [project, baseDate, scale, scaleConfig, offsetRange]);

    const fetchProject = useCallback(async () => {
        try {
            const res  = await apiFetch(`/projects/${uuid}/detail/`);
            const data = await res.json();
            setProject(data);
        } catch (e) {
            showToast(e.message, "error");
        } finally {
            setLoading(false);
        }
    }, [uuid]);

    const fetchComments = useCallback(async () => {
        try {
            const res  = await apiFetch(`/comments/${uuid}/`);
            const data = await res.json();
            setComments(Array.isArray(data) ? data : []);
        } catch { /* silently ignore */ }
    }, [uuid]);

    const fetchWarningTasks = useCallback(async () => {
        setWarningLoading(true);
        try {
            const res  = await apiFetch(`/tasks/warning-tasks/`);
            const data = await res.json();
            setWarningTasks(data.tasks || []);
        } catch (e) {
            showToast(e.message, "error");
        } finally {
            setWarningLoading(false);
        }
    }, []);

    useEffect(() => { fetchProject(); }, [fetchProject]);
    useEffect(() => {
        if (modal.comments) fetchComments();
    }, [modal.comments, fetchComments]);
    useEffect(() => {
        if (modal.warning) fetchWarningTasks();
    }, [modal.warning, fetchWarningTasks]);

    // ── WebSocket ──────────────────────────────────────────────────────────
    const wsRef = useRef(null);
    useEffect(() => {
        if (!uuid) return;
        if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;
        const ws = new WebSocket(`${WS_BASE}/ws/projects/${uuid}/?token=${getToken()}`);
        wsRef.current = ws;
        ws.onmessage = ({ data }) => {
            try {
                const msg = JSON.parse(data);
                if (msg.type === "project_progress") {
                    setProject(p => p ? { ...p, progress: msg.project_progress } : p);
                } else if (msg.type === "task_progress") {
                    setProject(p => {
                        if (!p) return p;
                        return {
                            ...p,
                            tasks: (p.tasks || []).map(t =>
                                t.uuid === msg.task_uuid
                                    ? { ...t, progress: msg.progress, status: msg.status }
                                    : t
                            ),
                        };
                    });
                }
            } catch { /* ignore */ }
        };
        return () => { ws.close(); wsRef.current = null; };
    }, [uuid]);

    // ── Derived data ───────────────────────────────────────────────────────
    const tasks          = project?.tasks           || [];
    const projectMembers = project?.project_members || [];
    const isCreator      = project?.is_creator      || false;

    const isWarning = useCallback((task) => {
        if (task.status === "done") return false;
        const now   = Date.now();
        const start = new Date(task.start_date).getTime();
        const end   = new Date(task.end_date).getTime();
        const total = end - start;
        if (total <= 0) return false;
        const ratio = 1 - (now - start) / total;
        return ratio <= 0.1 || (ratio <= 0.5 && task.status === "todo");
    }, []);

    const filteredTasks = useMemo(() => tasks.filter(t => {
        if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (filter === "done"     && t.status !== "done")      return false;
        if (filter === "warn"     && !isWarning(t))            return false;
        if (filter === "inreview" && t.status !== "in_review") return false;
        return true;
    }), [tasks, search, filter, isWarning]);

    const tasksByMember = useMemo(() => {
        const map = {};
        projectMembers.forEach(m => { map[m.userproject_uuid] = []; });
        filteredTasks.forEach(t => {
            if (t.userproject_uuid && map[t.userproject_uuid] !== undefined) {
                map[t.userproject_uuid].push(t);
            }
        });
        return map;
    }, [filteredTasks, projectMembers]);

    const inReviewTasks = useMemo(() => tasks.filter(t => t.status === "in_review"), [tasks]);
    const totalTasks    = tasks.length;
    const doneTasks     = tasks.filter(t => t.status === "done").length;
    const warnTasks     = tasks.filter(isWarning).length;

    const daysLeft = useMemo(() => {
        if (!project?.end_date) return 0;
        const diff = new Date(project.end_date) - new Date();
        const r    = Math.ceil(diff / 86400000);
        return isNaN(r) ? 0 : r;
    }, [project?.end_date]);

    const safeOffset = viewOffset ?? offsetRange.min;

    const columnHeaders = useMemo(() => {
        const { totalUnits, unit } = scaleConfig;
        return Array.from({ length: totalUnits }, (_, i) => {
            if (unit === "week") {
                const d = offsetToDate(safeOffset * 7 + i * 7, baseDate);
                return { label: fmtLocalShort(d.toISOString()), isToday: false };
            } else if (unit === "month") {
                const d = offsetToDate(safeOffset * 30 + i * 30, baseDate);
                return { label: d.toLocaleDateString("vi-VN", { month: "short", year: "numeric" }), isToday: false };
            } else {
                const d       = offsetToDate(safeOffset + i, baseDate);
                const isToday = (safeOffset + i) === 0;
                return { label: fmtLocalShort(d.toISOString()), isToday };
            }
        });
    }, [scale, safeOffset, baseDate, scaleConfig]);

    const navStep = scale === "day" ? 7 : scale === "week" ? 4 : 1;
    const canPrev = safeOffset > offsetRange.min;
    const canNext = safeOffset < offsetRange.max;
    const navPrev = () => setViewOffset(v => clamp((v ?? offsetRange.min) - navStep, offsetRange.min, offsetRange.max));
    const navNext = () => setViewOffset(v => clamp((v ?? offsetRange.min) + navStep, offsetRange.min, offsetRange.max));

    const rangeLabel = useMemo(() => {
        const d = offsetToDate(safeOffset, baseDate);
        return d.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
    }, [safeOffset, baseDate, scale]);

    // ── Member click → scroll to row ───────────────────────────────────────
    const handleMemberClick = useCallback((userproject_uuid) => {
        const rowEl = memberRowRefs.current[userproject_uuid];
        if (rowEl && ganttScrollRef.current) {
            rowEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, []);

    // ── Task hover tooltip ─────────────────────────────────────────────────
    const handleTaskHover = useCallback((task, member, e) => {
        if (!task) {
            setTooltip(t => ({ ...t, visible: false }));
            return;
        }
        setTooltip({ task, member, x: e.clientX, y: e.clientY, visible: true });
    }, []);

    // ── Handlers ───────────────────────────────────────────────────────────
    const handleCreateTask = async (tasksArray) => {
        setApiLoading(true);
        try {
            await apiFetch(`/tasks/${uuid}/bulk-create/`, {
                method: "POST",
                body:   JSON.stringify({ tasks: tasksArray }),
            });
            showToast(`Đã tạo ${tasksArray.length} task`);
            setModal(m => ({ ...m, createTask: false }));
            fetchProject();
        } catch (e) { showToast(e.message, "error"); }
        finally { setApiLoading(false); }
    };

    const handleSaveTask = async (taskUuid, payload) => {
        setApiLoading(true);
        try {
            await apiFetch(`/tasks/${taskUuid}/update/`, { method: "PATCH", body: JSON.stringify(payload) });
            showToast("Đã cập nhật task");
            setModal(m => ({ ...m, editTask: false }));
            fetchProject();
        } catch (e) { showToast(e.message, "error"); }
        finally { setApiLoading(false); }
    };

    const handleDeleteTask = async (taskUuid) => {
        if (!window.confirm("Xóa task này?")) return;
        setApiLoading(true);
        try {
            await apiFetch(`/tasks/bulk-delete/`, {
                method: "POST",
                body:   JSON.stringify({ task_uuids: [taskUuid] }),
            });
            showToast("Đã xóa task");
            fetchProject();
        } catch (e) { showToast(e.message, "error"); }
        finally { setApiLoading(false); }
    };

    const handleRemindTask = async (task) => {
        try {
            await apiFetch(`/tasks/${task.uuid}/remind/`, { method: "POST" });
            showToast(`Đã gửi nhắc nhở: "${task.name}"`);
        } catch (e) { showToast(e.message, "error"); }
    };

    const handleApproveTask = async (taskUuid, approved) => {
        setApiLoading(true);
        try {
            await apiFetch(`/tasks/${taskUuid}/approve/`, {
                method: "PATCH",
                body:   JSON.stringify({ approved }),
            });
            showToast(approved ? "Đã duyệt task" : "Đã từ chối task");
            fetchProject();
        } catch (e) { showToast(e.message, "error"); }
        finally { setApiLoading(false); }
    };

    const handleApproveAll = async () => {
        if (!window.confirm(`Duyệt tất cả ${inReviewTasks.length} task?`)) return;
        setApiLoading(true);
        try {
            await Promise.all(
                inReviewTasks.map(t =>
                    apiFetch(`/tasks/${t.uuid}/approve/`, {
                        method: "PATCH",
                        body:   JSON.stringify({ approved: true }),
                    })
                )
            );
            showToast(`Đã duyệt ${inReviewTasks.length} task`);
            setModal(m => ({ ...m, approve: false }));
            fetchProject();
        } catch (e) { showToast(e.message, "error"); }
        finally { setApiLoading(false); }
    };

    const handleAddMember = async (userprofile_uuid) => {
        setApiLoading(true);
        try {
            await apiFetch(`/projects/${uuid}/members/add/`, {
                method: "POST",
                body:   JSON.stringify({ user_uuid: userprofile_uuid }),
            });
            showToast("Đã thêm thành viên vào dự án");
            fetchProject();
        } catch (e) { showToast(e.message, "error"); }
        finally { setApiLoading(false); }
    };

    const handleKickMember = async (userproject_uuid) => {
        if (!window.confirm("Kick thành viên này?")) return;
        setApiLoading(true);
        try {
            await apiFetch(`/projects/members/${userproject_uuid}/kick/`, { method: "DELETE" });
            showToast("Đã kick thành viên");
            fetchProject();
        } catch (e) { showToast(e.message, "error"); }
        finally { setApiLoading(false); }
    };

    const handleSaveProject = async (payload) => {
        setApiLoading(true);
        try {
            if (payload.name || payload.description) {
                await apiFetch(`/projects/update-name/${uuid}/`, {
                    method: "PATCH",
                    body:   JSON.stringify({
                        name:        payload.name        || project.name,
                        description: payload.description !== undefined ? payload.description : project.description,
                    }),
                });
            }
            if (payload.start_date || payload.end_date) {
                await apiFetch(`/projects/update-dates/${uuid}/`, {
                    method: "PATCH",
                    body:   JSON.stringify({
                        start_date: payload.start_date || project.start_date,
                        end_date:   payload.end_date   || project.end_date,
                    }),
                });
            }
            showToast("Đã cập nhật dự án");
            setModal(m => ({ ...m, editProject: false }));
            fetchProject();
        } catch (e) { showToast(e.message, "error"); }
        finally { setApiLoading(false); }
    };

    // ── Render guards ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className={styles.page} style={{ alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "#64748b", fontSize: 14 }}>Đang tải dự án...</div>
            </div>
        );
    }
    if (!project) {
        return (
            <div className={styles.page} style={{ alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "#ef4444", fontSize: 14 }}>Không tìm thấy dự án</div>
            </div>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className={styles.page}>

            {/* ── TOP ROW ──────────────────────────────────────── */}
            <div className={styles.topRow}>
                <div className={styles.projectCard}>
                    <button className={styles.backBtn} onClick={() => {
                        localStorage.removeItem("project_page_last_route");
                        navigate("/projects");
                    }}>
                        <Icon.Back />
                    </button>

                    <div className={styles.projectBody}>
                        <div className={styles.titleRow}>
                            <span className={styles.projectTitle}>{project.name}</span>
                            <span className={`${styles.badge} ${
                                project.status === "ongoing"  ? styles.badgeGreen :
                                project.status === "finished" ? styles.badgeRed   : styles.badgeBlue
                            }`}>
                                {project.status === "preparing" ? "Chuẩn bị" :
                                 project.status === "ongoing"   ? "Đang chạy" : "Kết thúc"}
                            </span>
                            {isCreator && (
                                <button className={styles.editProjBtn}
                                    onClick={() => setModal(m => ({ ...m, editProject: true }))}>
                                    <Icon.Edit /> Chỉnh sửa
                                </button>
                            )}
                        </div>

                        <p className={styles.projectDesc}>{project.description || "Chưa có mô tả"}</p>

                        <div className={styles.metaRow}>
                            <div className={styles.dateGroup}>
                                <div className={styles.dateBlock}>
                                    <span className={styles.dateLabel}><Icon.Clock /> Bắt đầu</span>
                                    <span className={styles.dateVal}>{fmtLocal(project.start_date)}</span>
                                </div>
                                <div className={styles.dateArrow}>→</div>
                                <div className={styles.dateBlock}>
                                    <span className={styles.dateLabel}><Icon.Clock /> Kết thúc</span>
                                    <span className={styles.dateVal} style={{
                                        color: daysLeft < 3 && project.status !== "finished" ? "#ef4444" : undefined
                                    }}>{fmtLocal(project.end_date)}</span>
                                </div>
                                {daysLeft > 0 && project.status !== "finished" && (
                                    <div className={styles.daysLeftPill} style={{
                                        background:  daysLeft < 3 ? "#fee2e2" : daysLeft < 7 ? "#fef3c7" : "#dcfce7",
                                        color:       daysLeft < 3 ? "#dc2626" : daysLeft < 7 ? "#d97706" : "#16a34a",
                                        borderColor: daysLeft < 3 ? "#fca5a5" : daysLeft < 7 ? "#fcd34d" : "#86efac",
                                    }}>
                                        {daysLeft}d còn lại
                                    </div>
                                )}
                            </div>

                            <div className={styles.leaderPill}>
                                <Avatar src={project.leader?.avatarpath} name={project.leader?.fullname} size={28} round />
                                <div className={styles.leaderMeta}>
                                    <span className={styles.leaderLabel}>Project Leader</span>
                                    <span className={styles.leaderName}>{project.leader?.fullname}</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.progressRow}>
                            <span className={styles.progressLabel}>Tiến độ tổng</span>
                            <div className={styles.progressTrack}>
                                <div className={styles.progressFill} style={{ width: `${project.progress}%` }} />
                            </div>
                            <span className={styles.progressPct}>{project.progress}%</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className={styles.rightPanel}>
                    <div className={styles.actionCard}>
                        <div className={styles.cardTitle}>Thao tác nhanh</div>
                        <div className={styles.actionBtns}>
                            {isCreator && (
                                <button className={`${styles.actBtn} ${styles.actBtnPrimary}`}
                                    onClick={() => setModal(m => ({ ...m, createTask: true }))}>
                                    <Icon.Plus /> Tạo task
                                </button>
                            )}
                            <button className={styles.actBtn}
                                onClick={() => setModal(m => ({ ...m, members: true }))}>
                                <Icon.Users /> Thành viên
                            </button>
                            <button className={styles.actBtn}
                                onClick={() => setModal(m => ({ ...m, comments: true }))}>
                                <Icon.Message /> Comment
                            </button>
                        </div>
                        {/* Secondary actions row */}
                        <div className={styles.actionBtns} style={{ marginTop: 6 }}>
                            <button
                                className={styles.actBtn}
                                style={{ borderColor: "#fed7aa", color: "#c2410c", background: warnTasks > 0 ? "#fff7ed" : undefined }}
                                onClick={() => setModal(m => ({ ...m, warning: true }))}
                            >
                                <Icon.Warning />
                                Cảnh báo{warnTasks > 0 ? ` (${warnTasks})` : ""}
                            </button>
                            {isCreator && (
                                <button
                                    className={styles.actBtn}
                                    style={{
                                        borderColor: inReviewTasks.length > 0 ? "#fde68a" : undefined,
                                        color: inReviewTasks.length > 0 ? "#92400e" : undefined,
                                        background: inReviewTasks.length > 0 ? "#fffbeb" : undefined,
                                    }}
                                    onClick={() => setModal(m => ({ ...m, approve: true }))}
                                >
                                    <Icon.ThumbsUp />
                                    Duyệt{inReviewTasks.length > 0 ? ` (${inReviewTasks.length})` : ""}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className={styles.membersCard}>
                        <div className={styles.cardTitle}>
                            Thành viên ({projectMembers.length})
                            <span style={{ fontSize: 8, color: "#94a3b8", fontWeight: 400, marginLeft: 4 }}>· click để di chuyển đến</span>
                        </div>
                        <div className={styles.membersRowWrap}>
                            {projectMembers.map(m => (
                                <div
                                    key={m.userproject_uuid}
                                    className={styles.memberAv}
                                    title={`${m.fullname} – click để xem trong timeline`}
                                    onClick={() => handleMemberClick(m.userproject_uuid)}
                                    style={{ cursor: "pointer" }}
                                >
                                    <Avatar src={m.avatarpath} name={m.fullname} size={34} round />
                                </div>
                            ))}
                            {isCreator && (
                                <button className={styles.addMemberBtn}
                                    onClick={() => setModal(m => ({ ...m, members: true }))}>
                                    <Icon.Plus />
                                </button>
                            )}
                        </div>
                        <div className={styles.miniStats}>
                            <div className={styles.miniStat}>
                                <div className={styles.miniStatLabel}>Hoàn thành</div>
                                <div className={styles.miniStatVal} style={{ color: "#22c55e" }}>
                                    {doneTasks} <span className={styles.miniStatSub}>/ {totalTasks}</span>
                                </div>
                            </div>
                            <div className={styles.miniStat}>
                                <div className={styles.miniStatLabel}>Chờ duyệt</div>
                                <div className={styles.miniStatVal} style={{ color: "#f59e0b" }}>
                                    {inReviewTasks.length} <span className={styles.miniStatSub}>task</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── STATS ROW ────────────────────────────────────── */}
            {!expanded && (
                <div className={styles.statsRow}>
                    {[
                        { label: "Tổng Tasks",   val: totalTasks,            sub: "task trong dự án", color: "#4f46e5" },
                        { label: "Hoàn thành",   val: doneTasks,             sub: "task đã done",      color: "#22c55e" },
                        { label: "Cần nhắc nhở", val: warnTasks,             sub: "cần xử lý",         color: warnTasks > 0 ? "#f59e0b" : "#22c55e" },
                        { label: "Ngày còn lại", val: Math.max(0, daysLeft), sub: "đến deadline",      color: daysLeft < 3 ? "#f87171" : "#f59e0b" },
                    ].map(s => (
                        <div key={s.label} className={styles.statCard}>
                            <div className={styles.statLabel}>{s.label}</div>
                            <div className={styles.statVal} style={{ color: s.color }}>{String(s.val)}</div>
                            <div className={styles.statSub}>{s.sub}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── TIMELINE SECTION ─────────────────────────────── */}
            <div className={`${styles.timelineSection} ${expanded ? styles.timelineSectionExpanded : ""}`}>

                {/* Toolbar */}
                <div className={styles.tlToolbar}>
                    <div className={styles.searchBox}>
                        <Icon.Search />
                        <input
                            placeholder="Tìm kiếm task..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {[
                        { key: "all",      label: "Tất cả" },
                        { key: "done",     label: "Hoàn thành" },
                        { key: "inreview", label: "Chờ duyệt" },
                        { key: "warn",     label: `⚠ Nhắc nhở${warnTasks > 0 ? ` (${warnTasks})` : ""}` },
                    ].map(f => (
                        <button
                            key={f.key}
                            className={`${styles.filterBtn} ${filter === f.key ? styles.filterBtnActive : ""}`}
                            style={f.key === "warn" && warnTasks > 0 ? { borderColor: "#f59e0b", color: "#d97706" } : {}}
                            onClick={() => setFilter(f.key)}
                        >
                            {f.label}
                        </button>
                    ))}

                    <div className={styles.scaleGroup}>
                        {Object.entries(SCALES).map(([key, s]) => (
                            <button
                                key={key}
                                className={`${styles.scaleBtn} ${scale === key ? styles.scaleBtnActive : ""}`}
                                onClick={() => setScale(key)}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <div className={styles.viewNav}>
                        <button className={styles.navBtn} onClick={navPrev} disabled={!canPrev}
                            title={!canPrev ? "Đã đến ngày bắt đầu dự án" : ""}>
                            <Icon.ChevronLeft />
                        </button>
                        <span className={styles.navLabel}>{rangeLabel}</span>
                        <button className={styles.navBtn} onClick={navNext} disabled={!canNext}
                            title={!canNext ? "Đã đến ngày kết thúc dự án" : ""}>
                            <Icon.ChevronRight />
                        </button>
                    </div>

                    {isCreator && (
                        <button className={styles.actBtn} onClick={() => setModal(m => ({ ...m, createTask: true }))}>
                            <Icon.Plus /> Thêm task
                        </button>
                    )}

                    <button className={styles.expandBtn} onClick={() => setExpanded(e => !e)}
                        title={expanded ? "Thu gọn" : "Mở rộng"}>
                        {expanded ? <Icon.Compress /> : <Icon.Expand />}
                    </button>
                </div>

                {/* Gantt Table — scroll both X and Y */}
                <div className={styles.tlScrollWrap} ref={ganttScrollRef}>
                    <table
                        className={styles.ganttTable}
                        style={{ minWidth: 160 + scaleConfig.totalUnits * scaleConfig.unitWidth }}
                    >
                        <colgroup>
                            <col style={{ width: 160 }} />
                            {columnHeaders.map((_, i) => (
                                <col key={i} style={{ width: scaleConfig.unitWidth }} />
                            ))}
                        </colgroup>
                        <thead className={styles.ganttHead}>
                            <tr>
                                <th style={{ textAlign: "left", paddingLeft: 12 }}>Thành viên</th>
                                {columnHeaders.map((d, i) => (
                                    <th key={i} className={d.isToday ? styles.todayHeader : ""}>
                                        {d.label}
                                        {d.isToday && (
                                            <div style={{ fontSize: 7, color: "#6366f1", marginTop: 1 }}>hôm nay</div>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {projectMembers.length === 0 ? (
                                <tr>
                                    <td colSpan={scaleConfig.totalUnits + 1}
                                        style={{ textAlign: "center", padding: 32, color: "#94a3b8", fontSize: 13 }}>
                                        Chưa có thành viên nào trong dự án
                                    </td>
                                </tr>
                            ) : (
                                projectMembers.map(m => (
                                    <GanttRow
                                        key={m.userproject_uuid}
                                        member={m}
                                        tasks={tasksByMember[m.userproject_uuid] || []}
                                        viewOffset={safeOffset}
                                        totalUnits={scaleConfig.totalUnits}
                                        scale={scale}
                                        baseDate={baseDate}
                                        onEdit={task => {
                                            setEditingTask(task);
                                            setModal(mm => ({ ...mm, editTask: true }));
                                        }}
                                        onDelete={handleDeleteTask}
                                        onRemind={handleRemindTask}
                                        isCreator={isCreator}
                                        rowRef={el => { memberRowRefs.current[m.userproject_uuid] = el; }}
                                        onTaskHover={handleTaskHover}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── MODALS ───────────────────────────────────────── */}
            <EditProjectModal
                open={modal.editProject}
                onClose={() => setModal(m => ({ ...m, editProject: false }))}
                project={project}
                onSave={handleSaveProject}
                loading={apiLoading}
            />
            <CreateTaskModal
                open={modal.createTask}
                onClose={() => setModal(m => ({ ...m, createTask: false }))}
                projectMembers={projectMembers}
                onSave={handleCreateTask}
                loading={apiLoading}
            />
            <EditTaskModal
                open={modal.editTask}
                onClose={() => setModal(m => ({ ...m, editTask: false }))}
                task={editingTask}
                onSave={handleSaveTask}
                loading={apiLoading}
            />
            <MembersModal
                open={modal.members}
                onClose={() => setModal(m => ({ ...m, members: false }))}
                project={project}
                onKick={handleKickMember}
                onAdd={handleAddMember}
                loading={apiLoading}
            />
            <CommentsModal
                open={modal.comments}
                onClose={() => setModal(m => ({ ...m, comments: false }))}
                comments={comments}
                projectUuid={uuid}
                isCreator={isCreator}
                onRefresh={fetchComments}
                loading={apiLoading}
            />
            <WarningTasksModal
                open={modal.warning}
                onClose={() => setModal(m => ({ ...m, warning: false }))}
                warningTasks={warningTasks}
                warningLoading={warningLoading}
            />
            <ApproveTasksModal
                open={modal.approve}
                onClose={() => setModal(m => ({ ...m, approve: false }))}
                inReviewTasks={inReviewTasks}
                onApprove={handleApproveTask}
                onApproveAll={handleApproveAll}
                loading={apiLoading}
            />

            {/* ── TASK TOOLTIP ─────────────────────────────────── */}
            <TaskTooltip
                task={tooltip.task}
                member={tooltip.member}
                visible={tooltip.visible}
                x={tooltip.x}
                y={tooltip.y}
            />

            <Toast message={toast.msg} show={toast.show} type={toast.type} />
        </div>
    );
}

