// Tasks.jsx — Real API, progress update, help request, navigate to detail
import styles from "./Tasks.module.css";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

// ─── Status logic (mirrors backend) ──────────────────────────────────────────
// progress == 0                         → todo
// 0 < progress < 100                    → inprogress
// progress == 100 && is_approved=false  → in_review
// progress == 100 && is_approved=true   → done
function computeStatus(progress, isApproved) {
    if (progress === 0)   return "todo";
    if (progress < 100)   return "inprogress";
    if (!isApproved)      return "in_review";
    return "done";
}

const STATUS_META = {
    todo:       { label: "Chưa làm",    cls: "s_todo"     },
    inprogress: { label: "Đang làm",    cls: "s_doing"    },
    in_review:  { label: "Chờ duyệt",   cls: "s_review"   },
    done:       { label: "Hoàn thành",  cls: "s_done"     },
    overdue:    { label: "Quá hạn",     cls: "s_overdue"  },
};

const PRIORITY_META = {
    critical: { label: "Khẩn cấp",   cls: "p_critical" },
    high:     { label: "Cao",         cls: "p_high"     },
    medium:   { label: "Trung bình",  cls: "p_medium"   },
    low:      { label: "Thấp",        cls: "p_low"      },
};

const QUICK_FILTERS = [
    { key: "all",       label: "Tất cả"      },
    { key: "todo",      label: "Chưa làm"    },
    { key: "inprogress",label: "Đang làm"    },
    { key: "in_review", label: "Chờ duyệt"   },
    { key: "done",      label: "Hoàn thành"  },
    { key: "overdue",   label: "Quá hạn"     },
];

function getDaysLeft(endDate) {
    return Math.ceil((new Date(endDate) - new Date()) / 86400000);
}

function fmtDate(d) {
    const dt = new Date(d);
    return `${dt.getDate()}/${dt.getMonth() + 1}`;
}

function getProgressColor(pct, approved) {
    if (approved || pct === 100) return "var(--c-done)";
    if (pct >= 70) return "var(--c-primary)";
    if (pct >= 30) return "#818cf8";
    return "var(--c-medium)";
}

// ─── Progress Slider Modal ────────────────────────────────────────────────────
function ProgressModal({ task, onClose, onSave, saving }) {
    const [val, setVal] = useState(task.progress ?? 0);

    const statusPreview = computeStatus(val, task.is_approved);
    const meta          = STATUS_META[statusPreview] || STATUS_META.todo;

    return (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div
                className={styles.modal}
                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1,    y: 0  }}
                exit={{   opacity: 0, scale: 0.94, y: 16  }}
                transition={{ duration: 0.18 }}
            >
                <div className={styles.modal_header}>
                    <span className={styles.modal_title}>Cập nhật tiến độ</span>
                    <button className={styles.modal_close} onClick={onClose}>✕</button>
                </div>

                <p className={styles.modal_task_name}>{task.name}</p>

                <div className={styles.slider_row}>
                    <span className={styles.slider_pct}>{val}%</span>
                    <span className={`${styles.status_badge} ${styles[meta.cls]}`}>
                        <span className={styles.s_dot} />
                        {meta.label}
                    </span>
                </div>

                <input
                    type="range" min={0} max={100} step={1}
                    value={val}
                    onChange={e => setVal(Number(e.target.value))}
                    className={styles.slider}
                />

                <div className={styles.slider_labels}>
                    <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                </div>

                {val === 100 && (
                    <div className={styles.note_review}>
                        Đặt 100% sẽ chuyển sang trạng thái <strong>Chờ duyệt</strong> — Leader sẽ xem xét và phê duyệt.
                    </div>
                )}

                <div className={styles.modal_footer}>
                    <button className={styles.btn_ghost} onClick={onClose}>Hủy</button>
                    <button
                        className={styles.btn_primary_modal}
                        onClick={() => onSave(task.uuid, val)}
                        disabled={saving || val === task.progress}
                    >
                        {saving ? "Đang lưu…" : "Lưu tiến độ"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, index, onOpenProgress, onToggleHelp, helpLoading }) {
    const navigate = useNavigate();

    // const status   = computeStatus(task.progress, task.is_approved);
    const status   = task.status;
    const sMeta    = STATUS_META[status]   || STATUS_META.todo;
    const pMeta    = PRIORITY_META[task.priority] || PRIORITY_META.medium;
    const days     = getDaysLeft(task.end_date);
    const pColor   = getProgressColor(task.progress, task.is_approved);
    // const isOverdue = days < 0 && status !== "done";
    const isOverdue = status === "overdue";
    return (
        <motion.div
            className={`${styles.card} ${styles[`b_${task.priority}`]} ${isOverdue ? styles.card_overdue : ""}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ delay: index * 0.04, ease: "easeOut" }}
        >
            {/* ── Header ── */}
            <div className={styles.card_header}>
                <span className={`${styles.priority_badge} ${styles[pMeta.cls]}`}>
                    {pMeta.label}
                </span>
                <span className={`${styles.status_badge} ${styles[sMeta.cls]}`}>
                    <span className={styles.s_dot} />
                    {sMeta.label}
                </span>
            </div>

            {/* ── Title ── */}
            <p className={styles.card_title}>{task.name}</p>

            {/* ── Project ── */}
            <p className={styles.card_project}>
                📁 {task.project_name}
                {task.group_name && <span className={styles.group_sep}> · {task.group_name}</span>}
            </p>

            {/* ── Dates ── */}
            <div className={styles.card_dates}>
                <span>{fmtDate(task.start_date)}</span>
                <span className={styles.arrow}>→</span>
                <span>{fmtDate(task.end_date)}</span>
                {task.estimation_time != null && (
                    <>
                        <span className={styles.dot_sep}>·</span>
                        <span>{Math.round(task.estimation_time / 60)}h ước tính</span>
                    </>
                )}
            </div>

            {/* ── Progress ── */}
            <div className={styles.progress_section}>
                <div className={styles.progress_track}>
                    <div
                        className={styles.progress_fill}
                        style={{ width: `${task.progress}%`, background: pColor }}
                    />
                </div>
                <div className={styles.progress_meta}>
                    <span style={{ color: pColor, fontWeight: 700 }}>{task.progress}%</span>
                    <span className={styles.progress_hint}>
                        {status === "done"      ? "✓ Đã duyệt"           :
                         status === "in_review" ? "⏳ Đang chờ duyệt"   :
                         task.progress === 0    ? "Chưa bắt đầu"         :
                                                   `còn ${100 - task.progress}%`}
                    </span>
                </div>
            </div>

            {/* ── Deadline row ── */}
            <div className={styles.bottom_row}>
                <span className={
                    days > 3  ? styles.days_ok   :
                    days > 0  ? styles.days_warn  :
                    days === 0? styles.days_today :
                                styles.days_over
                }>
                    {days > 0  ? `⏱ ${days} ngày`          :
                     days === 0 ? "⚡ Hôm nay"              :
                                  `⚠ Quá ${Math.abs(days)}n`}
                </span>

                <div className={styles.flags}>
                    {isOverdue && (
                        <span className={styles.flag_overdue} title="Quá hạn">🔴</span>
                    )}
                </div>
            </div>

            {/* ── Footer actions ── */}
            <div className={styles.card_footer}>
                {/* Chỉ hiện nút Cập nhật nếu task chưa done */}
                {status !== "done" && (
                    <button
                        className={styles.btn_update}
                        onClick={() => onOpenProgress(task)}
                    >
                        📊 Cập nhật
                    </button>
                )}

                {/* <button
                    className={`${styles.btn_help} ${task.need_help ? styles.btn_help_active : ""}`}
                    onClick={() => onToggleHelp(task)}
                    disabled={helpLoading === task.uuid}
                    title={task.need_help ? "Hủy yêu cầu hỗ trợ" : "Yêu cầu hỗ trợ từ Leader"}
                >
                    {task.need_help ? "🆘 Đang cần help" : "🙋 Help"}
                </button> */}

                <button
                    className={styles.btn_detail}
                    onClick={() => navigate(`/project-detail/${task.project_uuid}/`)}
                    title="Xem chi tiết dự án"
                >
                    Chi tiết
                </button>
            </div>
        </motion.div>
    );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Tasks() {
    const [tasks,        setTasks       ] = useState([]);
    const [loading,      setLoading     ] = useState(true);
    const [activeFilter, setActiveFilter] = useState("all");
    const [sortBy,       setSortBy      ] = useState("deadline");
    const [search,       setSearch      ] = useState("");
    const [progressTask, setProgressTask] = useState(null);  // task đang mở modal
    const [saving,       setSaving      ] = useState(false);
    const [helpLoading,  setHelpLoading ] = useState(null);  // uuid đang toggle
    const [toast,        setToast       ] = useState(null);

    // ── Fetch my tasks ──────────────────────────────────────────────────────
    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const res  = await apiFetch("/tasks/my-tasks/");
            const data = await res.json();
            setTasks(Array.isArray(data.tasks) ? data.tasks : []);
        } catch (e) {
            showToast("Không thể tải danh sách task: " + e.message, "error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    // ── Toast helper ────────────────────────────────────────────────────────
    const showToast = (msg, type = "ok") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 2800);
    };

    // ── Update progress ─────────────────────────────────────────────────────
    const handleSaveProgress = async (taskUuid, progress) => {
        setSaving(true);

        try {
            const res  = await apiFetch(`/tasks/${taskUuid}/progress/`, {
                method: "PATCH",
                body: JSON.stringify({ progress }),
            });

            const data = await res.json();

            if (!res.ok) {
                const errorMessage =
                    data.detail ||
                    data.message ||
                    Object.values(data)[0]?.[0];

                throw new Error(errorMessage);
            }

            // Optimistic update
            setTasks(prev => prev.map(t =>
                t.uuid === taskUuid
                    ? { ...t, progress: data.progress, status: data.status }
                    : t
            ));

            setProgressTask(null);

            showToast(`Đã cập nhật ${progress}%`);

        } catch (e) {
            showToast(e.message, "error");
        } finally {
            setSaving(false);
        }
    };
    // const handleSaveProgress = async (taskUuid, progress) => {
    //     setSaving(true);
    //     try {
    //         const res  = await apiFetch(`/tasks/${taskUuid}/progress/`, {
    //             method: "PATCH",
    //             body:   JSON.stringify({ progress }),
    //         });
    //         const data = await res.json();
    //         if (!res.ok) {
    //             const errorMessage =
    //                 data.detail ||
    //                 data.message ||
    //                 Object.values(data)[0]?.[0];

    //             throw new Error(errorMessage);
    //         }
    //         // Optimistic update
    //         setTasks(prev => prev.map(t =>
    //             t.uuid === taskUuid
    //                 ? { ...t, progress: data.progress, status: data.status }
    //                 : t
    //         ));
    //         setProgressTask(null);
    //         showToast(`Đã cập nhật ${progress}%`);
    //     } catch (e) {
    //         showToast(e.message, "error");
    //     } finally {
    //         setSaving(false);
    //     }
    // };

    // ── Toggle help ─────────────────────────────────────────────────────────
    const handleToggleHelp = async (task) => {
        setHelpLoading(task.uuid);
        const newVal = !task.need_help;
        try {
            const res  = await apiFetch(`/tasks/${task.uuid}/request-help/`, {
                method: "POST",
                body:   JSON.stringify({ need_help: newVal }),
            });
            const data = await res.json();

            setTasks(prev => prev.map(t =>
                t.uuid === task.uuid ? { ...t, need_help: data.need_help } : t
            ));
            showToast(data.message);
        } catch (e) {
            showToast(e.message, "error");
        } finally {
            setHelpLoading(null);
        }
    };

    // ── Filtered + sorted ───────────────────────────────────────────────────
    const processed = useMemo(() => {
        const isOverdue = t => getDaysLeft(t.end_date) < 0 && t.status !== "done";

        let result = tasks.filter(t => {
            if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
            switch (activeFilter) {
                case "todo":       return t.status === "todo";
                case "inprogress": return t.status === "inprogress";
                case "in_review":  return t.status === "in_review";
                case "done":       return t.status === "done";
                // case "todo":       return computeStatus(t.progress, t.is_approved) === "todo";
                // case "inprogress": return computeStatus(t.progress, t.is_approved) === "inprogress";
                // case "in_review":  return computeStatus(t.progress, t.is_approved) === "in_review";
                // case "done":       return computeStatus(t.progress, t.is_approved) === "done";
                case "need_help":  return t.need_help;
                case "overdue":    return isOverdue(t);
                default:           return true;
            }
        });

        result = [...result].sort((a, b) => {
            if (sortBy === "deadline")  return getDaysLeft(a.end_date) - getDaysLeft(b.end_date);
            if (sortBy === "priority") {
                const ord = ["critical","high","medium","low"];
                return ord.indexOf(a.priority) - ord.indexOf(b.priority);
            }
            if (sortBy === "progress") return a.progress - b.progress;
            return 0;
        });

        return result;
    }, [tasks, search, activeFilter, sortBy]);

    // ── Stats ───────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const isOverdue = t => getDaysLeft(t.end_date) < 0 && t.status !== "done";
        return {
            total:     tasks.length,
            doing:     tasks.filter(t => { const s = t.status; return s === "inprogress"; }).length,
            review:    tasks.filter(t => t.status === "in_review").length,
            overdue:   tasks.filter(isOverdue).length,
            // need_help: tasks.filter(t => t.need_help).length,
            done:      tasks.filter(t => t.status === "done").length,
        };
    }, [tasks]);

    const filterCount = (key) => {
        const isOverdue = t => getDaysLeft(t.end_date) < 0 && t.status !== "done";
        switch (key) {
            case "all":        return tasks.length;
            case "todo":       return tasks.filter(t => t.status === "todo").length;
            case "inprogress": return tasks.filter(t => t.status === "inprogress").length;
            case "in_review":  return tasks.filter(t => t.status === "in_review").length;
            case "done":       return tasks.filter(t => t.status === "done").length;
            // case "need_help":  return tasks.filter(t => t.need_help).length;
            case "overdue":    return tasks.filter(isOverdue).length;
            default:           return 0;
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div className={styles.page}>

            {/* ── STATS ── */}
            <div className={styles.stats_row}>
                {[
                    { label: "Tổng tasks",  value: stats.total,     cls: "stat_total"   },
                    { label: "Đang làm",    value: stats.doing,     cls: "stat_doing"   },
                    { label: "Chờ duyệt",   value: stats.review,    cls: "stat_review"  },
                    { label: "Quá hạn",     value: stats.overdue,   cls: "stat_overdue" },
                    { label: "Hoàn thành",  value: stats.done,      cls: "stat_done"    },
                ].map(s => (
                    <div key={s.label} className={`${styles.stat_card} ${styles[s.cls]}`}>
                        <span className={styles.stat_value}>{s.value}</span>
                        <span className={styles.stat_label}>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* ── CONTROLS ── */}
            <div className={styles.controls}>
                <div className={styles.search_row}>
                    <div className={styles.search_wrap}>
                        <svg className={styles.search_icon} viewBox="0 0 20 20" fill="none">
                            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M13 13l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <input
                            type="text"
                            placeholder="Tìm kiếm task..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className={styles.search_input}
                        />
                    </div>

                    <select
                        className={styles.sort_select}
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                    >
                        <option value="deadline">Deadline gần nhất</option>
                        <option value="priority">Priority cao nhất</option>
                        <option value="progress">Progress thấp nhất</option>
                    </select>

                    <button
                        className={styles.btn_refresh}
                        onClick={fetchTasks}
                        disabled={loading}
                        title="Tải lại"
                    >
                        {loading ? "…" : "↻"}
                    </button>
                </div>

                <div className={styles.filter_pills}>
                    {QUICK_FILTERS.map(f => (
                        <button
                            key={f.key}
                            className={`${styles.pill} ${activeFilter === f.key ? styles.pill_active : ""}`}
                            onClick={() => setActiveFilter(f.key)}
                        >
                            {f.label}
                            <span className={styles.pill_count}>{filterCount(f.key)}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── GRID ── */}
            <div className={styles.grid_wrapper}>
                {loading ? (
                    <div className={styles.loading_state}>
                        <div className={styles.spinner} />
                        <span>Đang tải task...</span>
                    </div>
                ) : (
                    <div className={styles.task_grid}>
                        <AnimatePresence mode="popLayout">
                            {processed.length === 0 && (
                                <motion.div
                                    key="empty"
                                    className={styles.empty}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    Không có task nào 🫙
                                </motion.div>
                            )}
                            {processed.map((task, i) => (
                                <TaskCard
                                    key={task.uuid}
                                    task={task}
                                    index={i}
                                    onOpenProgress={setProgressTask}
                                    onToggleHelp={handleToggleHelp}
                                    helpLoading={helpLoading}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* ── PROGRESS MODAL ── */}
            <AnimatePresence>
                {progressTask && (
                    <ProgressModal
                        key={progressTask.uuid}
                        task={progressTask}
                        onClose={() => setProgressTask(null)}
                        onSave={handleSaveProgress}
                        saving={saving}
                    />
                )}
            </AnimatePresence>

            {/* ── TOAST ── */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        className={`${styles.toast} ${toast.type === "error" ? styles.toast_error : ""}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0  }}
                        exit={{   opacity: 0, y: 20  }}
                    >
                        {toast.type === "error" ? "✕" : "✓"} {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}