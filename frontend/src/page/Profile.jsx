import styles from "./Profile2.module.css";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { API_BASE } from "../config/env";
// ──────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────
const CROP_SIZE = 260;

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
const getInitials = (name = "") =>
  name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();

const LEVEL_LABELS = {
  1: "Beginner",
  2: "Junior",
  3: "Intermediate",
  4: "Advanced",
  5: "Expert",
};

const LEVEL_COLORS = {
  1: "#94a3b8",
  2: "#60a5fa",
  3: "#34d399",
  4: "#f59e0b",
  5: "#f43f5e",
};

// ──────────────────────────────────────────────
// CROP MODAL
// ──────────────────────────────────────────────
function CropModal({ src, onSave, onClose }) {
  const [offset,     setOffset]     = useState({ x: 0, y: 0 });
  const [scale,      setScale]      = useState(1);
  const [dragging,   setDragging]   = useState(false);
  const [dragStart,  setDragStart]  = useState({ x: 0, y: 0 });
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [saving,     setSaving]     = useState(false);

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
            src={src}
            alt="crop"
            draggable={false}
            style={{
              position: "absolute",
              left: offset.x,
              top: offset.y,
              width: imgNatural.w * scale,
              height: imgNatural.h * scale,
              userSelect: "none",
            }}
          />
          <div className={styles.crop_mask} />
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
// RELIABILITY SCORE RING
// ──────────────────────────────────────────────
function ReliabilityRing({ value, max = 100 }) {
  const size   = 96;
  const stroke = 7;
  const r      = (size - stroke * 2) / 2;
  const circ   = 2 * Math.PI * r;
  const pct    = Math.min(value / max, 1);
  const dash   = circ * pct;

  const color =
    value >= 8 ? "#10b981" :
    value >= 5 ? "#f59e0b" :
                  "#ef4444";

  const label =
    value >= 8 ? "Đáng tin cậy" :
    value >= 5 ? "Trung bình" :
                  "Cần cải thiện";

  return (
    <div className={styles.ring_block}>
      <div className={styles.ring_wrap}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none"/>
          <circle
            cx={size/2} cy={size/2} r={r}
            stroke={color} strokeWidth={stroke} fill="none"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className={styles.ring_inner}>
          <span className={styles.ring_value} style={{ color }}>{value}</span>
          <span className={styles.ring_of}>/{max}</span>
        </div>
      </div>
      <div className={styles.ring_meta}>
        <span className={styles.ring_title}>Điểm tin cậy</span>
        <span className={styles.ring_label} style={{ color }}>{label}</span>
        <p className={styles.ring_hint}>
          Điểm được tính tự động dựa trên lịch sử hoàn thành task, độ đúng hạn và đánh giá từ thành viên khác.
        </p>
      </div>
    </div>
  );
}
function PasswordModal({
  form,
  setForm,
  onClose,
  onSubmit,
  loading,
}) {
  return (
    <div className={styles.crop_overlay} onClick={onClose}>
      <div
        className={styles.password_modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.crop_header}>
          <span className={styles.crop_title}>Đổi mật khẩu</span>
          <button className={styles.crop_close} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.password_body}>
          <div className={styles.password_group}>
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />
          </div>

          <div className={styles.password_group}>
            <label>Mật khẩu hiện tại</label>
            <input
              type="password"
              value={form.old_password}
              onChange={(e) =>
                setForm({ ...form, old_password: e.target.value })
              }
            />
          </div>

          <div className={styles.password_group}>
            <label>Mật khẩu mới</label>
            <input
              type="password"
              value={form.new_password}
              onChange={(e) =>
                setForm({ ...form, new_password: e.target.value })
              }
            />
          </div>

          <div className={styles.password_group}>
            <label>Nhập lại mật khẩu mới</label>
            <input
              type="password"
              value={form.confirm_password}
              onChange={(e) =>
                setForm({
                  ...form,
                  confirm_password: e.target.value,
                })
              }
            />
          </div>
        </div>

        <div className={styles.crop_footer}>
          <button
            className={styles.crop_cancel_btn}
            onClick={onClose}
          >
            Hủy
          </button>

          <button
            className={styles.crop_save_btn}
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? "Đang đổi..." : "Đổi mật khẩu"}
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
  // ── State: user data from API ──
  const [user,        setUser]        = useState(null);
  const [loading,     setLoading]     = useState(true);

  // ── State: edit mode ──
  const [editMode,    setEditMode]    = useState(false);
  const [editUser,    setEditUser]    = useState({});
  const [savingInfo,  setSavingInfo]  = useState(false);

  // ── State: avatar ──
  const [cropSrc,     setCropSrc]     = useState(null);
  const [avatarUrl,   setAvatarUrl]   = useState("");
  const [avatarError, setAvatarError] = useState(false);
  const fileInputRef = useRef();

  // ── State: skills ──
  const [skills,       setSkills]       = useState([]);
  const [loadingSkills,setLoadingSkills]= useState(true);
  const [newSkill,     setNewSkill]     = useState("");
  const [newLevel,     setNewLevel]     = useState(1);
  const [addingSkill,  setAddingSkill]  = useState(false);
  const [editSkillIdx, setEditSkillIdx] = useState(null);
  const [editSkillVal, setEditSkillVal] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    email: "",
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  // ── Toast ──
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };
  const handleChangePassword = async () => {
    if (
      !passwordForm.email ||
      !passwordForm.old_password ||
      !passwordForm.new_password
    ) {
      showToast("Vui lòng nhập đầy đủ thông tin", "error");
      return;
    }

    if (
      passwordForm.new_password !==
      passwordForm.confirm_password
    ) {
      showToast("Mật khẩu xác nhận không khớp", "error");
      return;
    }

    if (passwordForm.new_password.length < 6) {
      showToast(
        "Mật khẩu mới phải có ít nhất 6 ký tự",
        "error"
      );
      return;
    }

    setChangingPassword(true);

    try {
      const res = await apiFetch(
        "/accounts/change-password/",
        {
          method: "POST",
          headers: {},
          body: JSON.stringify({
            email: passwordForm.email,
            current_password:
              passwordForm.old_password,
            new_password:
              passwordForm.new_password,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        showToast("Đổi mật khẩu thành công ✓");

        setPasswordForm({
          email: user.email || "",
          old_password: "",
          new_password: "",
          confirm_password: "",
        });

        setShowPasswordModal(false);

        // Nếu muốn bắt user đăng nhập lại:
        // localStorage.removeItem("access");
        // localStorage.removeItem("refresh");
        // navigate("/login");
      } else {
        showToast(
          data.error || "Đổi mật khẩu thất bại",
          "error"
        );
      }
    } catch {
      showToast("Lỗi kết nối server", "error");
    } finally {
      setChangingPassword(false);
    }
  };
  // ── Fetch profile on mount ──
  useEffect(() => {
    apiFetch(`/accounts/me/`, {
      headers: {},
    })
      .then((r) => r.json())
      .then((data) => {
        setUser(data);
        setEditUser(data);
        if (data.avatarpath) setAvatarUrl(`${API_BASE}${data.avatarpath}`);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Fetch skills on mount ──
  useEffect(() => {
    apiFetch(`/skills/my-skills/`, {
      headers: {},
    })
      .then((r) => r.json())
      .then((data) => {
        setSkills(Array.isArray(data) ? data : []);
        setLoadingSkills(false);
      })
      .catch(() => setLoadingSkills(false));
  }, []);

  // ── Avatar: pick file → crop ──
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
    e.target.value = "";
  };

  // ── Avatar: crop save → API ──
  const handleCropSave = async (blob) => {
    setAvatarUrl(URL.createObjectURL(blob));
    setAvatarError(false);
    setCropSrc(null);
    const formData = new FormData();
    formData.append("avatarpath", blob, "avatar.jpg");
    try {
      const res = await apiFetch(`/accounts/profile/avatar/`, {
        method: "POST",
        headers: {},
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(`${API_BASE}${data.avatar}`);
        showToast("Ảnh đại diện đã được cập nhật ✓");
      } else {
        showToast("Upload thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối server", "error");
    }
  };

  // ── Save profile info ──
  const handleSaveInfo = async () => {
    setSavingInfo(true);
    try {
      const res = await apiFetch(`/accounts/profile/`, {
        method: "PATCH",
        headers: {

        },
        body: JSON.stringify({
          fullname: editUser.fullname,
          email:    editUser.email,
          phone:    editUser.phone,
          address:  editUser.address,
          user_code: editUser.user_code,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUser({ ...user, ...updated });
        setEditMode(false);
        showToast("Thông tin đã được cập nhật ✓");
      } else {
        showToast("Cập nhật thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối server", "error");
    } finally {
      setSavingInfo(false);
    }
  };

  // ── Add skill ──
  const handleAddSkill = async () => {
    const name = newSkill.trim();
    if (!name) return;
    setAddingSkill(true);
    try {
      const res = await apiFetch(`/skills/create/`, {
        method: "POST",
        headers: {
        },
        body: JSON.stringify({ name, level: newLevel }),
      });
      const data = await res.json();
      if (res.ok) {
        setSkills([...skills, data]);
        setNewSkill("");
        setNewLevel(1);
        showToast(`Đã thêm "${name}" ✓`);
      } else {
        showToast(data.error ?? "Thêm skill thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối server", "error");
    } finally {
      setAddingSkill(false);
    }
  };

  // ── Delete skill ──
  const handleDeleteSkill = async (skill) => {
    try {
      const res = await apiFetch(`/skills/delete/${skill.skill_uuid}/`, {
        method: "DELETE",
        headers: {},
      });
      if (res.ok) {
        setSkills(skills.filter((s) => s.skill_uuid !== skill.skill_uuid));
        showToast(`Đã xóa "${skill.name}"`);
      } else {
        showToast("Xóa thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối server", "error");
    }
  };

  // ──────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.loading_screen}>
        <div className={styles.spinner} />
        <span>Đang tải...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.loading_screen}>
        <span className={styles.error_msg}>Không thể tải hồ sơ. Vui lòng đăng nhập lại.</span>
      </div>
    );
  }

  return (
    <div className={styles.page}>

      {/* ── CROP MODAL ── */}
      {cropSrc && (
        <CropModal src={cropSrc} onSave={handleCropSave} onClose={() => setCropSrc(null)} />
      )}
      {showPasswordModal && (
        <PasswordModal
          form={passwordForm}
          setForm={setPasswordForm}
          onClose={() => setShowPasswordModal(false)}
          onSubmit={handleChangePassword}
          loading={changingPassword}
        />
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
          {toast.msg}
        </div>
      )}

      {/* ─────────────────────────────────────
          HEADER: Avatar + Identity
          ───────────────────────────────────── */}
      <div className={styles.header_card}>
        {/* Avatar */}
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
          <button
            className={styles.avatar_btn}
            onClick={() => fileInputRef.current?.click()}
            title="Đổi ảnh"
          >
            <svg viewBox="0 0 16 16" fill="none" width="11" height="11">
              <path d="M11 2l3 3-8 8H3v-3L11 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>

        {/* Identity */}
        <div className={styles.identity}>
          <h1 className={styles.fullname}>{user.fullname}</h1>
          <button
            className={styles.changePasswordBtn}
            onClick={() => {
              setPasswordForm({
                email: user.email || "",
                old_password: "",
                new_password: "",
                confirm_password: "",
              });
              setShowPasswordModal(true);
            }}
          >
            🔒 Đổi mật khẩu
          </button>
          <div className={styles.meta_row}>
            <span className={styles.username}>@{user.username}</span>
            {user.user_code && (
              <>
                <span className={styles.dot}>·</span>
                <span className={styles.user_code}>{user.user_code}</span>
              </>
            )}
          </div>
          <span className={styles.email_chip}>{user.email}</span>
        </div>
      </div>

      {/* ─────────────────────────────────────
          BODY: Two columns
          ───────────────────────────────────── */}
      <div className={styles.body}>

        {/* ── LEFT: Personal info + Reliability ── */}
        <div className={styles.left_col}>

          {/* Personal Info Card */}
          <div className={styles.card}>
            <div className={styles.card_header}>
              <span className={styles.card_title}>Thông tin cá nhân</span>

              {!editMode ? (
                <button className={styles.edit_btn} onClick={() => { setEditMode(true); setEditUser({ ...user }); }}>
                  <svg viewBox="0 0 16 16" fill="none" width="11" height="11">
                    <path d="M11 2l3 3-8 8H3v-3L11 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                  Chỉnh sửa
                </button>
                
              ) : (
                <div className={styles.action_row}>
                  <button className={styles.cancel_btn} onClick={() => setEditMode(false)}>Hủy</button>
                  <button className={styles.save_btn} onClick={handleSaveInfo} disabled={savingInfo}>
                    {savingInfo ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              )}
            </div>

            <div className={styles.info_grid}>
              {[
                { key: "fullname", icon: "👤", label: "Họ và tên",     type: "text"  },
                { key: "email",    icon: "✉️",  label: "Email",          type: "email" },
                { key: "phone",    icon: "📞",  label: "Số điện thoại", type: "tel"   },
                { key: "address",  icon: "📍",  label: "Địa chỉ",       type: "text"  },
                { key: "user_code", icon: "🪪",  label: "Mã thành viên",  type: "text"  },
              ].map(({ key, icon, label, type }) => (
                <div key={key} className={styles.info_item}>
                  <div className={styles.info_label_row}>
                    <span className={styles.info_icon}>{icon}</span>
                    <span className={styles.info_label}>{label}</span>
                  </div>
                  {editMode ? (
                    <input
                      className={styles.info_input}
                      type={type}
                      value={editUser[key] ?? ""}
                      onChange={(e) => setEditUser({ ...editUser, [key]: e.target.value })}
                    />
                  ) : (
                    <span className={styles.info_value}>{user[key] || "—"}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Reliability Card */}
          <div className={styles.card}>
            <div className={styles.card_header}>
              <span className={styles.card_title}>Điểm tin cậy</span>
            </div>
            <ReliabilityRing value={user.reliability_score ?? 0} max={10} />
          </div>

        </div>

        {/* ── RIGHT: Skills ── */}
        <div className={styles.right_col}>
          <div className={`${styles.card} ${styles.card_stretch}`}>
            <div className={styles.card_header}>
              <span className={styles.card_title}>Kỹ năng</span>
              <span className={styles.skill_count_badge}>{skills.length} skills</span>
            </div>

            {/* Add skill row */}
            <div className={styles.add_skill_row}>
              <input
                className={styles.skill_name_input}
                placeholder="Tên skill mới..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSkill()}
              />
              <select
                className={styles.level_select}
                value={newLevel}
                onChange={(e) => setNewLevel(Number(e.target.value))}
              >
                {Object.entries(LEVEL_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <button
                className={styles.add_btn}
                onClick={handleAddSkill}
                disabled={addingSkill || !newSkill.trim()}
              >
                {addingSkill ? "..." : "+ Thêm"}
              </button>
            </div>

            {/* Skill list */}
            <div className={styles.skill_list}>
              {loadingSkills ? (
                <div className={styles.skills_loading}>
                  <div className={styles.spinner_sm} />
                </div>
              ) : skills.length === 0 ? (
                <div className={styles.empty_skills}>
                  <span>Chưa có skill nào. Thêm skill đầu tiên của bạn!</span>
                </div>
              ) : (
                skills.map((sk, i) => (
                  <div key={sk.skill_uuid ?? i} className={styles.skill_row}>
                    <div className={styles.skill_left}>
                      <span
                        className={styles.level_dot}
                        style={{ background: LEVEL_COLORS[sk.level] ?? "#94a3b8" }}
                      />
                      {editSkillIdx === i ? (
                        <input
                          className={styles.skill_edit_input}
                          value={editSkillVal}
                          onChange={(e) => setEditSkillVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setSkills(skills.map((s, idx) => idx === i ? { ...s, name: editSkillVal } : s));
                              setEditSkillIdx(null);
                            }
                            if (e.key === "Escape") setEditSkillIdx(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className={styles.skill_name}>{sk.name}</span>
                      )}
                    </div>

                    <div className={styles.skill_right}>
                      <span
                        className={styles.level_badge}
                        style={{
                          color: LEVEL_COLORS[sk.level] ?? "#94a3b8",
                          background: `${LEVEL_COLORS[sk.level] ?? "#94a3b8"}18`,
                        }}
                      >
                        {LEVEL_LABELS[sk.level] ?? "—"}
                      </span>
                      {sk.years_of_experience > 0 && (
                        <span className={styles.exp_text}>{sk.years_of_experience}yr</span>
                      )}
                      {sk.verified && (
                        <span className={styles.verified_badge} title="Đã xác minh">✓</span>
                      )}
                      <button
                        className={styles.del_btn}
                        onClick={() => handleDeleteSkill(sk)}
                        title="Xóa skill"
                      >
                        <svg viewBox="0 0 16 16" fill="none" width="10" height="10">
                          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Profile;
