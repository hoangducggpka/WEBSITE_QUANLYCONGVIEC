import styles from "./Projects2.module.css";
import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LuChevronsUpDown } from "react-icons/lu";
import { FaAnglesRight, FaAnglesLeft } from "react-icons/fa6";
import { FaTrashAlt, FaSearch, FaCaretDown } from "react-icons/fa";
import { GiCancel } from "react-icons/gi";
import { IoIosCreate } from "react-icons/io";
import { LuListFilter } from "react-icons/lu";
import { MdOutlineGroups } from "react-icons/md";
import { apiFetch } from "../utils/api";

// ─── Constants ────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 9;
const LAST_GROUP_KEY = "projects_last_group_uuid";

// ─── Helpers ──────────────────────────────────────────────────────────────────
// groups/my-groups response shape:
//   { uuid, group_name, leader{user_id,username,fullname,avatarpath},
//     members[{user_id,username,fullname,avatarpath}],
//     color, is_leader, created_at }
//
// projects/my-projects response shape:
//   { uuid, name, group_name, status, start_date, end_date,
//     leader{user_id,username,avatarpath}, is_creator,
//     members[{uuid,user_id,username,avatarpath,user_code}],
//     color, progress }

const STATUS_VI = {
  preparing: "Chuẩn bị",
  ongoing:   "Đang diễn ra",
  finished:  "Đã kết thúc",
};

function statusCls(s) {
  if (s === "ongoing")   return styles.tagOngoing;
  if (s === "preparing") return styles.tagPreparing;
  return styles.tagFinished;
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

// ─── AvatarStack ──────────────────────────────────────────────────────────────
function AvatarStack({ people = [], max = 4, size = 30 }) {
  const shown = people.slice(0, max);
  const rest  = people.length - max;
  return (
    <div className={styles.avatarStack}>
      {shown.map((p, i) =>
        p.avatarpath
          ? <img key={p.user_id ?? i} src={p.avatarpath} alt="" title={p.fullname || p.username}
              style={{ width: size, height: size, zIndex: max - i }} />
          : <div key={p.user_id ?? i} className={styles.avatarInitial}
              style={{ width: size, height: size, zIndex: max - i }}>
              {(p.fullname || p.username || "?")[0].toUpperCase()}
            </div>
      )}
      {rest > 0 && (
        <div className={styles.avatarMore} style={{ width: size, height: size }}>+{rest}</div>
      )}
    </div>
  );
}

// ─── CreateProjectModal ───────────────────────────────────────────────────────
function CreateProjectModal({ group, onClose, onCreated }) {
  const [form, setForm]       = useState({ name: "", start_date: "", end_date: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const setField = (k) => (e) => { setForm(p => ({ ...p, [k]: e.target.value })); setError(""); };

  const determineStatus = (start, end) => {
    const now = new Date();
    const s = new Date(start);
    const e = new Date(end);

    if (now < s) return "preparing";
    if (now >= s && now <= e) return "ongoing";
      return "finished";
  };
  const submit = async () => {
    if (!form.name.trim())                 return setError("Vui lòng nhập tên dự án.");
    if (!form.start_date || !form.end_date) return setError("Vui lòng chọn ngày bắt đầu và kết thúc.");
    setLoading(true);
    const start = new Date(form.start_date);
    const end = new Date(form.end_date);

    const status = determineStatus(start, end);

    const payload = {
      name: form.name,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      status: status,
    };

    console.log("PAYLOAD:", payload);
    try {
      const res = await apiFetch(
        `/projects/${group.uuid}/create/`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },

      );

      const data = await res.json();

      console.log("SUCCESS:", data);

      onCreated();
      onClose();
    }
    catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <motion.div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className={styles.modalHd}>
          <h2>Tạo dự án mới</h2>
          <button className={styles.closeBtn} onClick={onClose}><GiCancel /></button>
        </div>

        <div className={styles.modalBd}>
          <p className={styles.modalGroupHint}>
            Nhóm: <strong>{group.group_name}</strong>
          </p>
          <label>Tên dự án</label>
          <input
            className={styles.inp}
            value={form.name}
            onChange={setField("name")}
            placeholder="Nhập tên dự án…"
          />
          <label>Ngày bắt đầu</label>
          <input
            className={styles.inp}
            type="datetime-local"
            value={form.start_date}
            onChange={setField("start_date")}
          />
          <label>Ngày kết thúc</label>
          <input
            className={styles.inp}
            type="datetime-local"
            value={form.end_date}
            onChange={setField("end_date")}
          />
          {error && <p className={styles.errMsg}>{error}</p>}
        </div>

        <div className={styles.modalFt}>
          <button className={styles.btnGhost} onClick={onClose}>Hủy</button>
          <button className={styles.btnPrimary} onClick={submit} disabled={loading}>
            {loading ? "Đang tạo…" : "Tạo dự án"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── GroupSelectModal ─────────────────────────────────────────────────────────
function GroupSelectModal({ onClose, onSelect, currentUuid }) {
  const navigate = useNavigate();
  const [groups,  setGroups]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [mode,    setMode]    = useState("managed"); // "managed" | "joined"

  useEffect(() => {
    apiFetch("/groups/my-groups/", { method: "GET" })
      .then(async res => {
        const data = await res.json();
        console.log(data);
        setGroups(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = groups.filter(g => {
    const matchMode = mode === "managed" ? g.is_leader : !g.is_leader;
    const matchSearch = g.group_name.toLowerCase().includes(search.toLowerCase());
    return matchMode && matchSearch;
  });

  return (
    <div className={styles.overlay} onClick={onClose}>
      <motion.div
        className={`${styles.modal} ${styles.groupModal}`}
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className={styles.modalHd}>
          <h2>Chọn nhóm</h2>
          <button className={styles.closeBtn} onClick={onClose}><GiCancel /></button>
        </div>

        {/* Searchbar – onChange để filter nhanh, không cần submit */}
        <div className={styles.groupSearch}>
          <FaSearch size={13} className={styles.searchIconSm} />
          <input
            placeholder="Tìm nhóm…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Mode toggle: Quản lý / Tham gia */}
        <div className={styles.modeToggle}>
          <button
            className={mode === "managed" ? styles.modeOn : ""}
            onClick={() => setMode("managed")}
          >
            Quản lý
          </button>
          <button
            className={mode === "joined" ? styles.modeOn : ""}
            onClick={() => setMode("joined")}
          >
            Tham gia
          </button>
        </div>

        {/* Group list */}
        <div className={styles.groupListScroll}>
          {loading && <p className={styles.emptyTxt}>Đang tải…</p>}
          {!loading && filtered.length === 0 && (
            <p className={styles.emptyTxt}>Không có nhóm nào.</p>
          )}
          {filtered.map(g => (
            <div
              key={g.uuid}
              className={`${styles.groupCard} ${g.uuid === currentUuid ? styles.groupCardActive : ""}`}
              onClick={() => { onSelect(g); onClose(); }}
            >
              <div className={styles.gcLeft}>
                {/* Group name – hover → navigate to group detail */}
                <h4
                  className={styles.gcName}
                  title="Đến trang chi tiết nhóm"
                  onClick={e => {
                    e.stopPropagation();
                    localStorage.setItem("project_page_last_route", "/group-detail");
                    navigate(`/group-detail?uuid=${g.uuid}`);
                    onClose();
                  }}
                >
                  {g.group_name}
                </h4>

                {/* Leader info */}
                <div className={styles.gcLeader}>
                  {g.leader?.avatarpath
                    ? <img src={g.leader.avatarpath} alt="ldr" />
                    : <div className={styles.avatarInitial} style={{ width: 28, height: 28 }}>
                        {(g.leader?.fullname || g.leader?.username || "?")[0].toUpperCase()}
                      </div>
                  }
                  <div>
                    <p>{g.leader?.fullname || g.leader?.username}</p>
                    <span>Leader</span>
                  </div>
                </div>
              </div>

              {/* Members */}
              <div className={styles.gcRight}>
                <AvatarStack people={g.members || []} max={4} size={28} />
                <p className={styles.memberCnt}>{g.members?.length ?? 0} thành viên</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── ProjectCard ──────────────────────────────────────────────────────────────
function ProjectCard({ item, index, selected, onToggle, onDetail }) {
  const pct = item.progress ?? 0;
  const fillColor =
    pct < 30 ? "linear-gradient(90deg,#ef4444,#f97316)"
  : pct < 70 ? "linear-gradient(90deg,#f59e0b,#fcd34d)"
  :            "linear-gradient(90deg,#22c55e,#4ade80)";

  return (
    <motion.div
      className={`${styles.card} ${selected ? styles.cardSel : ""}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0  }}
      transition={{ delay: index * 0.04, duration: 0.2, ease: "easeOut" }}
    >
      {/* Header */}
      <div className={styles.cardHd}>
        <input
          type="checkbox"
          className={styles.cardCb}
          checked={selected}
          onChange={onToggle}
          onClick={e => e.stopPropagation()}
        />
        <div className={styles.cardTitleWrap}>
          <h3 title={item.name}>{item.name}</h3>
          <div className={styles.cardTags}>
            <span className={`${styles.tag} ${statusCls(item.status)}`}>
              {STATUS_VI[item.status] ?? item.status}
            </span>
            {item.is_creator && (
              <span className={`${styles.tag} ${styles.tagLeader}`}>Leader</span>
            )}
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className={styles.cardDates}>
        <span>🗓 {fmtDate(item.start_date)}</span>
        <span className={styles.dateSep}>→</span>
        <span>{fmtDate(item.end_date)}</span>
      </div>

      {/* Progress */}
      <div className={styles.progressWrap}>
        <div className={styles.progressLbl}>
          <span>Tiến trình</span>
          <span className={styles.pct}>{pct}%</span>
        </div>
        <div className={styles.progressTrack}>
          <motion.div
            className={styles.progressFill}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            style={{ background: fillColor }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className={styles.cardFt}>
        {/* members[] từ my-projects có user_id, username, avatarpath */}
        <AvatarStack people={item.members || []} max={4} size={30} />
        <button className={styles.detailBtn} onClick={onDetail}>Chi tiết →</button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Projects() {
  const navigate = useNavigate();

  // Data
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [projects,      setProjects]      = useState([]);
  const [loading,       setLoading]       = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Filtering / sorting
  const [sortOrder, setSortOrder]   = useState("newest"); // "newest" | "oldest"
  const [search,    setSearch]      = useState("");
  const [page,      setPage]        = useState(1);

  // Dropdown visibility
  const [showCbDrop,   setShowCbDrop]   = useState(false);
  const [showSortDrop, setShowSortDrop] = useState(false);

  // Modal visibility
  const [showCreate, setShowCreate] = useState(false);
  const [showGroup,  setShowGroup]  = useState(false);

  const cbRef   = useRef(null);
  const sortRef = useRef(null);

  // ── Restore last selected group on mount ─────────────────────────────────
  useEffect(() => {
    const savedUuid = localStorage.getItem(LAST_GROUP_KEY);
    if (!savedUuid) return;

    apiFetch("/groups/my-groups/", { method: "GET" })
      .then(async res => {
        const data = await res.json();

        const found = data.find(
          g => g.uuid === savedUuid
        );

        if (found) {
          setSelectedGroup(found);
        }
      })
      .catch(console.error);
  }, []);

  // ── Fetch projects when selected group changes ────────────────────────────
  const fetchProjects = () => {
    if (!selectedGroup) { setProjects([]); return; }
    setLoading(true);
    // GET /api/projects/my-projects/  → filter client-side by group_name
    apiFetch("/projects/my-projects/", {
      method: "GET"
    })
    .then(async res => {
      const data = await res.json();

      const all = data.filter(
        p => p.group_name === selectedGroup.group_name
      );

      setProjects(all);
    })
    .catch(err => {
      console.error(err);
      setProjects([]);
    })
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    setSelectedIds(new Set());
    setPage(1);
    fetchProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup]);

  // ── Close dropdowns on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (cbRef.current   && !cbRef.current.contains(e.target))   setShowCbDrop(false);
      if (sortRef.current && !sortRef.current.contains(e.target)) setShowSortDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Processed (filtered + sorted) list ───────────────────────────────────
  const processed = projects
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const da = new Date(a.start_date), db = new Date(b.start_date);
      return sortOrder === "newest" ? db - da : da - db;
    });

  const totalPages = Math.max(1, Math.ceil(processed.length / ITEMS_PER_PAGE));
  const paginated  = processed.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // ── Selection helpers ─────────────────────────────────────────────────────
  const toggle     = (uuid) => setSelectedIds(prev => { const n = new Set(prev); n.has(uuid) ? n.delete(uuid) : n.add(uuid); return n; });
  const selAll     = ()     => setSelectedIds(new Set(processed.map(p => p.uuid)));
  const selStatus  = (s)   => setSelectedIds(new Set(processed.filter(p => p.status === s).map(p => p.uuid)));
  const deselAll   = ()    => setSelectedIds(new Set());
  const allChecked = paginated.length > 0 && paginated.every(p => selectedIds.has(p.uuid));

  // ── Delete selected projects ──────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selectedIds.size) return;
    if (!window.confirm(`Xóa ${selectedIds.size} dự án đã chọn?`)) return;
    try {
      // POST /api/projects/delete/  body: { project_uuids: [...] }
      await apiFetch(
        "/projects/delete/",
        { method: "POST", headers: {},
          body: JSON.stringify({ project_uuids: Array.from(selectedIds) }), },
      );
      setProjects(prev => prev.filter(p => !selectedIds.has(p.uuid)));
      setSelectedIds(new Set());
    } catch (err) {
      alert(err?.response?.data?.error || "Xóa thất bại.");
    }
  };
  const deleteMultipleProjects = async (projectIds) => {
    const confirmLeave = window.confirm("Bạn có chắc muốn xóa dự án(các dự án) không?");
    if (!confirmLeave) return;

    const res = await apiFetch(`/projects/delete/`, {
      method: "POST",
      headers: {

      },

    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Delete failed");
    alert(data.message || "Đã xóa dự án(các dự án) thành công!");
    fetchProjects();

    return data;
  };


  // ── Select group ──────────────────────────────────────────────────────────
  const handleSelectGroup = (g) => {
    setSelectedGroup(g);
    localStorage.setItem(LAST_GROUP_KEY, g.uuid);
  };

  // ── Navigate to project detail ────────────────────────────────────────────
  const goDetail = (uuid) => {
    localStorage.setItem("project_page_last_route", `/project-detail/${uuid}`);
    navigate(`/project-detail/${uuid}`);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className={styles.page}>

        {/* ══ TOP BAR ══════════════════════════════════════════════════════════ */}
        <div className={styles.topBar}>

          {/* Left: greeting + toolbar */}
          <div className={styles.topLeft}>
            <div className={styles.greeting}>
              <img src="5.png" alt="user" className={styles.userAvatar} />
              <div>
                <h3>Quản lý dự án</h3>
                <p>Theo dõi, phân tích và cải thiện kết quả dự án của bạn.</p>
              </div>
            </div>

            <div className={styles.toolbar}>

              {/* Checkbox + dropdown */}
              <div ref={cbRef} className={styles.dropWrap}>
                <div className={styles.cbBtn} onClick={() => setShowCbDrop(v => !v)}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={() => allChecked ? deselAll() : selAll()}
                    onClick={e => e.stopPropagation()}
                  />
                  <FaCaretDown size={11} />
                </div>
                <AnimatePresence>
                  {showCbDrop && (
                    <motion.div
                      className={styles.drop}
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.13 }}
                    >
                      <button onClick={() => { selAll();             setShowCbDrop(false); }}>Chọn tất cả</button>
                      <button onClick={() => { selStatus("ongoing"); setShowCbDrop(false); }}>Đang diễn ra</button>
                      <button onClick={() => { selStatus("preparing"); setShowCbDrop(false); }}>Chuẩn bị</button>
                      <button onClick={() => { selStatus("finished"); setShowCbDrop(false); }}>Đã kết thúc</button>
                      <div className={styles.dropDivider} />
                      <button onClick={() => { deselAll();           setShowCbDrop(false); }}>Bỏ chọn tất cả</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Sort dropdown */}
              <div ref={sortRef} className={styles.dropWrap}>
                <button className={styles.sortBtn} onClick={() => setShowSortDrop(v => !v)}>
                  <LuListFilter size={14} />
                  <span>{sortOrder === "newest" ? "Mới nhất" : "Cũ nhất"}</span>
                  <FaCaretDown size={11} />
                </button>
                <AnimatePresence>
                  {showSortDrop && (
                    <motion.div
                      className={styles.drop}
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.13 }}
                    >
                      <button onClick={() => { setSortOrder("newest"); setShowSortDrop(false); }}>
                        {sortOrder === "newest" && "✓ "}Mới nhất
                      </button>
                      <button onClick={() => { setSortOrder("oldest"); setShowSortDrop(false); }}>
                        {sortOrder === "oldest" && "✓ "}Cũ nhất
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Search */}
              <div className={styles.searchBar}>
                <FaSearch size={13} className={styles.searchIcon} />
                <input
                  placeholder="Tìm dự án…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
              </div>

              {/* Action buttons */}
              <div className={styles.actions}>
                {selectedGroup && (
                  <button className={styles.btnCreate} onClick={() => setShowCreate(true)}>
                    <IoIosCreate size={16} />Tạo dự án
                  </button>
                )}
                <AnimatePresence>
                  {selectedIds.size > 0 && (
                    <>
                      <motion.button className={styles.btnDel} onClick={handleDelete}
                        initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
                        <FaTrashAlt size={12} />Xóa ({selectedIds.size})
                      </motion.button>
                      <motion.button className={styles.btnDesel} onClick={deselAll}
                        initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
                        <GiCancel size={12} />Bỏ chọn
                      </motion.button>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right: group selector */}
          <div className={styles.topRight} >
            <div className={styles.groupInfo} >
              {selectedGroup ? (
                <>
                  <h3 onClick={() => {
                      navigate(`/group-detail/${selectedGroup?.uuid}/`);
                    }}
                    title={selectedGroup.group_name}

                  >{selectedGroup.group_name}</h3>
                  <div className={styles.groupLeaderRow}>
                    {selectedGroup.leader?.avatarpath
                      ? <img src={selectedGroup.leader.avatarpath} alt="ldr" className={styles.ldrAvatar} />
                      : <div className={`${styles.avatarInitial} ${styles.ldrAvatar}`}>
                          {(selectedGroup.leader?.fullname || selectedGroup.leader?.username || "?")[0].toUpperCase()}
                        </div>
                    }
                    <div>
                      <p className={styles.ldrName}>
                        {selectedGroup.leader?.fullname || selectedGroup.leader?.username}
                      </p>
                      <p className={styles.ldrRole}>— Leader —</p>
                    </div>
                  </div>
                  <AvatarStack people={selectedGroup.members || []} max={4} size={28} />
                </>
              ) : (
                <p className={styles.noGroupTxt}>Vui lòng chọn nhóm</p>
              )}
            </div>
            <div className={styles.groupToggle} onClick={() => setShowGroup(true)} >
              <LuChevronsUpDown size={20} />
            </div>
          </div>
        </div>

        {/* ══ CONTENT ══════════════════════════════════════════════════════════ */}
        <div className={styles.content}>
          {!selectedGroup ? (
            <div className={styles.emptyState}>
              <MdOutlineGroups size={64} />
              <p>Chọn một nhóm để xem các dự án</p>
              <button onClick={() => setShowGroup(true)}>Chọn nhóm</button>
            </div>
          ) : loading ? (
            <div className={styles.emptyState}><p>Đang tải dự án…</p></div>
          ) : paginated.length === 0 ? (
            <div className={styles.emptyState}><p>Không có dự án nào.</p></div>
          ) : (
            <div className={styles.grid}>
              {paginated.map((item, i) => (
                <ProjectCard
                  key={item.uuid}
                  item={item}
                  index={i}
                  selected={selectedIds.has(item.uuid)}
                  onToggle={() => toggle(item.uuid)}
                  onDetail={() => goDetail(item.uuid)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {processed.length > ITEMS_PER_PAGE && (
            <div className={styles.pagination}>
              <button className={styles.pageBtn} disabled={page === 1}
                onClick={() => setPage(p => p - 1)}><FaAnglesLeft /></button>
              <span>{page} / {totalPages}</span>
              <button className={styles.pageBtn} disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}><FaAnglesRight /></button>
            </div>
          )}
        </div>
      </div>

      {/* ══ MODALS ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCreate && selectedGroup && (
          <CreateProjectModal
            group={selectedGroup}
            onClose={() => setShowCreate(false)}
            onCreated={fetchProjects}
          />
        )}
        {showGroup && (
          <GroupSelectModal
            onClose={() => setShowGroup(false)}
            onSelect={handleSelectGroup}
            currentUuid={selectedGroup?.uuid}
          />
        )}
      </AnimatePresence>
    </>
  );
}