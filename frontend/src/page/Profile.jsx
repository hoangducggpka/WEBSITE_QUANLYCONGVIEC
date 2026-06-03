import styles from "./Profile.module.css";
import { useState, useRef, useEffect, useCallback } from "react";

// ──────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────
const CROP_SIZE = 260;
const API_BASE  = import.meta.env.VITE_API_URL ?? "";

// ──────────────────────────────────────────────
// FAKE DATA
// ──────────────────────────────────────────────
const INITIAL_USER = {
  uuid:              "28249800-c246-46bb-ae67-3d4cd6dccca9",
  username:          "anh123",
  email:             "anh@example.com",
  user_code:         "CQ15DH0182",
  fullname:          "Nguyen Van Anh",
  address:           "Quảng Ninh",
  phone:             "0123456789",
  avatarpath:        "",
  reliability_score: 78,
  joined_at:         "2024-09-01",
  role:              "Frontend Developer",
};

const FAKE_PROJECTS = [
  { id: 1, name: "E-commerce Platform",   status: "active",    progress: 72, role: "Frontend Lead", taskCount: 12, deadline: "2026-07-15", color: "#00e5bb" },
  { id: 2, name: "CRM System",            status: "completed", progress: 100, role: "Fullstack Dev",  taskCount: 18, deadline: "2026-04-30", color: "#6366f1" },
  { id: 3, name: "Mobile App MVP",        status: "active",    progress: 38, role: "UI/UX + Dev",    taskCount: 9,  deadline: "2026-08-01", color: "#f59e0b" },
  { id: 4, name: "Internal Tool v2",      status: "paused",    progress: 51, role: "Backend Dev",    taskCount: 7,  deadline: "2026-09-10", color: "#a78bfa" },
];

const FAKE_TASKS = [
  // Active
  { id: 1, title: "Thiết kế UI Dashboard",        project: "E-commerce Platform", projectId: 1, progress: 65, priority: "high",   dueDate: "2026-05-30", status: "doing" },
  { id: 2, title: "Xây dựng API Authentication",   project: "E-commerce Platform", projectId: 1, progress: 0,  priority: "urgent", dueDate: "2026-05-28", status: "todo" },
  { id: 3, title: "Fix responsive mobile",          project: "Mobile App MVP",      projectId: 3, progress: 45, priority: "medium", dueDate: "2026-06-05", status: "doing" },
  { id: 4, title: "Tối ưu database queries",       project: "Internal Tool v2",    projectId: 4, progress: 70, priority: "high",   dueDate: "2026-06-01", status: "doing" },
  // Completed / History
  { id: 5,  title: "Deploy production",             project: "CRM System", projectId: 2, progress: 100, priority: "high",   dueDate: "2026-04-15", completedAt: "2026-04-14", status: "done" },
  { id: 6,  title: "Database schema design",        project: "CRM System", projectId: 2, progress: 100, priority: "high",   dueDate: "2026-03-20", completedAt: "2026-03-19", status: "done" },
  { id: 7,  title: "User authentication module",   project: "CRM System", projectId: 2, progress: 100, priority: "urgent", dueDate: "2026-03-10", completedAt: "2026-03-08", status: "done" },
  { id: 8,  title: "API endpoint design",           project: "CRM System", projectId: 2, progress: 100, priority: "medium", dueDate: "2026-02-28", completedAt: "2026-02-26", status: "done" },
  { id: 9,  title: "Viết tài liệu kỹ thuật",      project: "CRM System", projectId: 2, progress: 100, priority: "low",    dueDate: "2026-04-25", completedAt: "2026-04-23", status: "done" },
  { id: 10, title: "Setup CI/CD pipeline",          project: "CRM System", projectId: 2, progress: 100, priority: "urgent", dueDate: "2026-01-10", completedAt: "2026-01-09", status: "done" },
];

const INIT_SKILLS = ["React", "TypeScript", "Node.js", "Python", "CSS/SCSS", "REST API", "Git", "Docker"];

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
const getInitials = (name = "") =>
  name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`;
};

const PRIORITY_MAP = {
  urgent: { label: "Khẩn cấp", color: "#ff4545" },
  high:   { label: "Cao",       color: "#ff8c44" },
  medium: { label: "Trung bình",color: "#ffd644" },
  low:    { label: "Thấp",      color: "#44e87e" },
};

const STATUS_MAP = {
  todo:    { label: "Chưa làm",   color: "#6b6b78" },
  doing:   { label: "Đang làm",   color: "#38bdf8" },
  done:    { label: "Hoàn thành", color: "#44e87e" },
  review:  { label: "Chờ review", color: "#a78bfa" },
};

// ──────────────────────────────────────────────
// SUBCOMPONENTS
// ──────────────────────────────────────────────

function StatRing({ value, max = 100, size = 72, stroke = 6, color = "#00e5bb", label }) {
  const r    = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(value / max, 1);
  const dash = circ * pct;

  return (
    <div className={styles.ring_wrap}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="#242428" strokeWidth={stroke} fill="none"/>
        <circle
          cx={size/2} cy={size/2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className={styles.ring_center}>
        <span className={styles.ring_value} style={{ color }}>{value}</span>
        <span className={styles.ring_max}>/{max}</span>
      </div>
      {label && <span className={styles.ring_label}>{label}</span>}
    </div>
  );
}

function CropModal({ src, onSave, onClose }) {
  const [offset, setOffset]     = useState({ x: 0, y: 0 });
  const [scale, setScale]       = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [saving, setSaving] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      const base = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight) * 1.05;
      setScale(base);
      setOffset({
        x: (CROP_SIZE - img.naturalWidth  * base) / 2,
        y: (CROP_SIZE - img.naturalHeight * base) / 2,
      });
      setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = src;
  }, [src]);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  }, [offset]);

  const onMouseMove = useCallback((e) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const onMouseUp = useCallback(() => setDragging(false), []);

  const handleSave = async () => {
    setSaving(true);
    const canvas = document.createElement("canvas");
    canvas.width  = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const ctx = canvas.getContext("2d");

    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    const img = new window.Image();
    img.src = src;
    await new Promise((res) => { img.onload = res; img.onerror = res; });
    ctx.drawImage(img, offset.x, offset.y, imgNatural.w * scale, imgNatural.h * scale);

    canvas.toBlob((blob) => onSave(blob), "image/jpeg", 0.92);
  };

  return (
    <div className={styles.crop_overlay} onClick={onClose}>
      <div className={styles.crop_modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.crop_header}>
          <span className={styles.crop_title}>Chỉnh ảnh đại diện</span>
          <button className={styles.crop_close} onClick={onClose}>✕</button>
        </div>

        <div
          className={styles.crop_preview}
          style={{ width: CROP_SIZE, height: CROP_SIZE, cursor: dragging ? "grabbing" : "grab" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <img
            ref={imgRef}
            src={src}
            alt="crop"
            draggable={false}
            style={{
              position: "absolute",
              left: offset.x,
              top:  offset.y,
              width:  imgNatural.w * scale,
              height: imgNatural.h * scale,
              userSelect: "none",
            }}
          />
          <div className={styles.crop_mask} />
          <div className={styles.crop_grid}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className={styles.crop_grid_line} style={{ left: `${(i+1)*25}%`, top: 0, width: 1, height: "100%" }} />
            ))}
            {[...Array(4)].map((_, i) => (
              <div key={i+4} className={styles.crop_grid_line} style={{ top: `${(i+1)*25}%`, left: 0, height: 1, width: "100%" }} />
            ))}
          </div>
        </div>

        <div className={styles.crop_controls}>
          <span className={styles.crop_ctrl_label}>🔍 Zoom</span>
          <input
            type="range" min="0.5" max="3" step="0.01"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className={styles.crop_slider}
          />
          <span className={styles.crop_ctrl_val}>{Math.round(scale * 100)}%</span>
        </div>

        <div className={styles.crop_footer}>
          <button className={styles.crop_cancel_btn} onClick={onClose}>Hủy</button>
          <button className={styles.crop_save_btn} onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu ảnh"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────
function Profile() {
  const [user,          setUser]          = useState(INITIAL_USER);
  const [editUser,      setEditUser]      = useState(INITIAL_USER);
  const [editMode,      setEditMode]      = useState(false);
  const [skills,        setSkills]        = useState(INIT_SKILLS);
  const [newSkill,      setNewSkill]      = useState("");
  const [editSkillIdx,  setEditSkillIdx]  = useState(null);
  const [editSkillVal,  setEditSkillVal]  = useState("");
  const [cropSrc,       setCropSrc]       = useState(null);
  const [avatarUrl,     setAvatarUrl]     = useState("");
  const [avatarError,   setAvatarError]   = useState(false);
  const [historyTab,    setHistoryTab]    = useState("history");
  const [copied,        setCopied]        = useState(false);
  const [toast,         setToast]         = useState(null);
  const [savingInfo,    setSavingInfo]    = useState(false);

  const fileInputRef = useRef();

  const activeTasks    = FAKE_TASKS.filter((t) => t.status !== "done");
  const completedTasks = FAKE_TASKS.filter((t) => t.status === "done");
  const completionRate = Math.round((completedTasks.length / FAKE_TASKS.length) * 100);
  const activeProjects = FAKE_PROJECTS.filter((p) => p.status === "active").length;

  // ── Toast helper ──
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  // ── Copy user_code ──
  const copyCode = () => {
    navigator.clipboard.writeText(user.user_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Avatar file pick ──
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    e.target.value = "";
  };

  // ── Avatar save (crop → API) ──
  const handleCropSave = async (blob) => {
    const preview = URL.createObjectURL(blob);
    setAvatarUrl(preview);
    setAvatarError(false);
    setCropSrc(null);

    const formData = new FormData();
    formData.append("avatarpath", blob, "avatar.jpg");
    try {
      const res = await fetch(`${API_BASE}/api/profile/avatar/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token") ?? ""}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.avatar);
        showToast("Ảnh đại diện đã được cập nhật ✓");
      } else {
        showToast("Upload thất bại, vui lòng thử lại", "error");
      }
    } catch {
      showToast("Lỗi kết nối server", "error");
    }
  };

  // ── Save user info (placeholder PUT) ──
  const handleSaveInfo = async () => {
    setSavingInfo(true);
    await new Promise((r) => setTimeout(r, 600)); // simulate API
    setUser(editUser);
    setEditMode(false);
    setSavingInfo(false);
    showToast("Thông tin đã được cập nhật ✓");
  };

  // ── Skills ──
  const addSkill = () => {
    const s = newSkill.trim();
    if (!s || skills.includes(s)) return;
    setSkills([...skills, s]);
    setNewSkill("");
  };

  const removeSkill = (idx) => setSkills(skills.filter((_, i) => i !== idx));

  const startEditSkill = (idx) => {
    setEditSkillIdx(idx);
    setEditSkillVal(skills[idx]);
  };

  const saveEditSkill = () => {
    const s = editSkillVal.trim();
    if (!s) return;
    setSkills(skills.map((sk, i) => (i === editSkillIdx ? s : sk)));
    setEditSkillIdx(null);
  };

  // ──────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── CROP MODAL ── */}
      {cropSrc && (
        <CropModal
          src={cropSrc}
          onSave={handleCropSave}
          onClose={() => setCropSrc(null)}
        />
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
          {toast.msg}
        </div>
      )}

      {/* ─────────────────────────────────────
          TOP STRIP: Avatar + Name + Quick Stats
          ───────────────────────────────────── */}
      <div className={styles.top_strip}>

        {/* AVATAR + IDENTITY */}
        <div className={styles.identity_card}>
          <div className={styles.avatar_wrap}>
            <div className={styles.avatar_circle}>
              {(!avatarUrl || avatarError) && (
                <span className={styles.avatar_initials}>{getInitials(user.fullname)}</span>
              )}
              {avatarUrl && !avatarError && (
                <img
                  src={avatarUrl}
                  className={styles.avatar_img}
                  alt="avatar"
                  onError={() => setAvatarError(true)}
                />
              )}
            </div>
            <button className={styles.avatar_btn} onClick={() => fileInputRef.current?.click()} title="Đổi ảnh">
              <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
                <path d="M11 2l3 3-8 8H3v-3L11 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              </svg>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
          </div>

          <div className={styles.identity_info}>
            <h2 className={styles.fullname}>{user.fullname}</h2>
            <span className={styles.role_tag}>{user.role}</span>
            <div className={styles.code_row}>
              <span className={styles.code_label}>@{user.username}</span>
              <span className={styles.code_sep}>•</span>
              <span className={styles.user_code}>{user.user_code}</span>
              <button className={styles.copy_btn} onClick={copyCode} title="Copy">
                {copied ? "✓" : "⎘"}
              </button>
            </div>
            <span className={styles.joined_at}>Tham gia {fmtDate(user.joined_at)}</span>
          </div>
        </div>

        {/* QUICK STATS */}
        <div className={styles.quick_stats}>
          {[
            { label: "Tổng tasks",    value: FAKE_TASKS.length,    color: "#818cf8" },
            { label: "Hoàn thành",    value: completedTasks.length, color: "#44e87e" },
            { label: "Dự án active",  value: activeProjects,        color: "#00e5bb" },
            { label: "Tỷ lệ hoàn thành", value: `${completionRate}%`, color: "#f59e0b" },
          ].map((s) => (
            <div key={s.label} className={styles.qstat}>
              <span className={styles.qstat_value} style={{ color: s.color }}>{s.value}</span>
              <span className={styles.qstat_label}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────
          MAIN CONTENT: Left panel + Right panel
          ───────────────────────────────────── */}
      <div className={styles.main}>

        {/* ──── LEFT PANEL ──── */}
        <div className={styles.left_panel}>

          {/* ── User Info Card ── */}
          <div className={styles.card}>
            <div className={styles.card_header}>
              <span className={styles.card_title}>Thông tin cá nhân</span>
              {!editMode ? (
                <button className={styles.icon_btn} onClick={() => { setEditMode(true); setEditUser(user); }}>
                  <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                    <path d="M11 2l3 3-8 8H3v-3L11 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                  </svg>
                  Sửa
                </button>
              ) : (
                <div className={styles.edit_actions}>
                  <button className={styles.cancel_btn} onClick={() => setEditMode(false)}>Hủy</button>
                  <button className={styles.save_btn} onClick={handleSaveInfo} disabled={savingInfo}>
                    {savingInfo ? "..." : "Lưu"}
                  </button>
                </div>
              )}
            </div>

            <div className={styles.info_list}>
              {[
                { key: "fullname", icon: "👤", label: "Họ tên" },
                { key: "email",    icon: "✉️", label: "Email" },
                { key: "phone",    icon: "📞", label: "Điện thoại" },
                { key: "address",  icon: "📍", label: "Địa chỉ" },
              ].map(({ key, icon, label }) => (
                <div key={key} className={styles.info_row}>
                  <span className={styles.info_icon}>{icon}</span>
                  <div className={styles.info_content}>
                    <span className={styles.info_label}>{label}</span>
                    {editMode ? (
                      <input
                        className={styles.info_input}
                        value={editUser[key]}
                        onChange={(e) => setEditUser({ ...editUser, [key]: e.target.value })}
                      />
                    ) : (
                      <span className={styles.info_value}>{user[key]}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Stats Card ── */}
          <div className={styles.card}>
            <div className={styles.card_header}>
              <span className={styles.card_title}>Chỉ số cá nhân</span>
            </div>
            <div className={styles.stats_rings}>
              <StatRing value={user.reliability_score} max={100} color="#f59e0b" label="Reliability" />
              <StatRing value={completionRate}          max={100} color="#00e5bb" label="Completion" />
              <StatRing value={activeProjects}          max={FAKE_PROJECTS.length} size={72} color="#a78bfa" label="Projects" />
            </div>
            <div className={styles.stat_badges}>
              {user.reliability_score >= 70 && <span className={styles.badge_gold}>⭐ Đáng tin cậy</span>}
              {completionRate >= 80            && <span className={styles.badge_green}>🎯 Hiệu suất cao</span>}
              {activeProjects >= 2             && <span className={styles.badge_blue}>🚀 Đa dự án</span>}
            </div>
          </div>

          {/* ── Skills Card ── */}
          <div className={styles.card}>
            <div className={styles.card_header}>
              <span className={styles.card_title}>Kỹ năng</span>
              <span className={styles.skill_count}>{skills.length} skills</span>
            </div>
            <div className={styles.skills_wrap}>
              {skills.map((sk, i) => (
                editSkillIdx === i ? (
                  <div key={i} className={styles.skill_edit_wrap}>
                    <input
                      className={styles.skill_edit_input}
                      value={editSkillVal}
                      onChange={(e) => setEditSkillVal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEditSkill()}
                      autoFocus
                    />
                    <button className={styles.skill_save} onClick={saveEditSkill}>✓</button>
                    <button className={styles.skill_cancel} onClick={() => setEditSkillIdx(null)}>✕</button>
                  </div>
                ) : (
                  <div key={i} className={styles.skill_chip}>
                    <span>{sk}</span>
                    <button className={styles.skill_edit_btn} onClick={() => startEditSkill(i)} title="Sửa">✎</button>
                    <button className={styles.skill_del_btn} onClick={() => removeSkill(i)} title="Xóa">✕</button>
                  </div>
                )
              ))}
            </div>
            <div className={styles.skill_add_row}>
              <input
                className={styles.skill_add_input}
                placeholder="Thêm skill mới..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSkill()}
              />
              <button className={styles.skill_add_btn} onClick={addSkill}>+</button>
            </div>
          </div>

        </div>

        {/* ──── RIGHT PANEL ──── */}
        <div className={styles.right_panel}>

          {/* ── Projects Overview ── */}
          <div className={styles.card}>
            <div className={styles.card_header}>
              <span className={styles.card_title}>Dự án đã tham gia</span>
              <button className={styles.see_all_btn}>Xem tất cả →</button>
            </div>
            <div className={styles.project_grid}>
              {FAKE_PROJECTS.map((p) => (
                <div key={p.id} className={styles.project_card} style={{ "--accent": p.color }}>
                  <div className={styles.proj_top}>
                    <span className={styles.proj_name}>{p.name}</span>
                    <span
                      className={styles.proj_status}
                      style={{
                        background: p.status === "active" ? "rgba(0,229,187,.1)" : p.status === "completed" ? "rgba(68,232,126,.1)" : "rgba(107,107,120,.1)",
                        color: p.status === "active" ? "#00e5bb" : p.status === "completed" ? "#44e87e" : "#6b6b78",
                      }}
                    >
                      {p.status === "active" ? "Active" : p.status === "completed" ? "Xong" : "Tạm dừng"}
                    </span>
                  </div>
                  <span className={styles.proj_role}>{p.role}</span>
                  <div className={styles.proj_progress_row}>
                    <div className={styles.proj_track}>
                      <div className={styles.proj_fill} style={{ width: `${p.progress}%`, background: p.color }} />
                    </div>
                    <span className={styles.proj_pct} style={{ color: p.color }}>{p.progress}%</span>
                  </div>
                  <div className={styles.proj_meta}>
                    <span>📋 {p.taskCount} tasks</span>
                    <span>📅 {fmtDate(p.deadline)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Tasks Panel (tab: active | history) ── */}
          <div className={`${styles.card} ${styles.card_flex}`}>
            <div className={styles.card_header}>
              <div className={styles.tab_group}>
                {/* <button
                  className={`${styles.tab} ${historyTab === "active" ? styles.tab_active : ""}`}
                  onClick={() => setHistoryTab("active")}
                >
                  Đang thực hiện
                  <span className={styles.tab_badge}>{activeTasks.length}</span>
                </button> */}
                <button
                  className={`${styles.tab} ${historyTab === "history" ? styles.tab_active : ""}`}
                  onClick={() => setHistoryTab("history")}
                >
                  Lịch sử hoàn thành
                  <span className={styles.tab_badge}>{completedTasks.length}</span>
                </button>
              </div>
              <button className={styles.see_all_btn}>Xem tất cả →</button>
            </div>

            <div className={styles.task_list}>
              {/* {historyTab === "active" && activeTasks.map((t) => (
                <div key={t.id} className={styles.task_row}>
                  <div className={styles.tr_left}>
                    <span
                      className={styles.tr_prio_dot}
                      style={{ background: PRIORITY_MAP[t.priority]?.color }}
                    />
                    <div className={styles.tr_info}>
                      <span className={styles.tr_title}>{t.title}</span>
                      <span className={styles.tr_project}>{t.project}</span>
                    </div>
                  </div>
                  <div className={styles.tr_right}>
                    <div className={styles.tr_progress_wrap}>
                      <div className={styles.tr_track}>
                        <div className={styles.tr_fill} style={{ width: `${t.progress}%` }} />
                      </div>
                      <span className={styles.tr_pct}>{t.progress}%</span>
                    </div>
                    <span
                      className={styles.tr_status}
                      style={{ color: STATUS_MAP[t.status]?.color }}
                    >
                      {STATUS_MAP[t.status]?.label}
                    </span>
                    <span className={styles.tr_due}>⏱ {fmtDate(t.dueDate)}</span>
                    <button className={styles.tr_btn}>Chi tiết</button>
                  </div>
                </div>
              ))} */}

              {historyTab === "history" && completedTasks.map((t) => (
                <div key={t.id} className={`${styles.task_row} ${styles.task_row_done}`}>
                  <div className={styles.tr_left}>
                    <span className={styles.tr_done_icon}>✓</span>
                    <div className={styles.tr_info}>
                      <span className={styles.tr_title}>{t.title}</span>
                      <span className={styles.tr_project}>{t.project}</span>
                    </div>
                  </div>
                  <div className={styles.tr_right}>
                    <span
                      className={styles.tr_prio}
                      style={{ color: PRIORITY_MAP[t.priority]?.color, background: `${PRIORITY_MAP[t.priority]?.color}18` }}
                    >
                      {PRIORITY_MAP[t.priority]?.label}
                    </span>
                    <span className={styles.tr_completed}>✓ {fmtDate(t.completedAt)}</span>
                    <span className={styles.tr_due_faded}>Deadline: {fmtDate(t.dueDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Profile;