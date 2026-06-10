import styles from "./Groups2.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { FaSearch } from "react-icons/fa";
import { HiSearchCircle } from "react-icons/hi";
import { AiOutlineTeam } from "react-icons/ai";
import { BsFillBookmarkPlusFill } from "react-icons/bs";
import {
  LiaSortAmountDownAltSolid,
  LiaSortAmountUpSolid,
} from "react-icons/lia";
import {
  MdOutlineFolder,
  MdOutlinePeople,
  MdOutlinePersonAdd,
  MdClose,
  MdCheck,
  MdErrorOutline,
} from "react-icons/md";

// ─────────────────────────────────────────────────────────────
// API CONFIG
// ─────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL ?? "";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("access_token") ?? ""}`,
});

// ─────────────────────────────────────────────────────────────
// AVATAR HELPERS
// ─────────────────────────────────────────────────────────────
const PALETTE = [
  { bg: "#B5D4F4", fg: "#0C447C" },
  { bg: "#9FE1CB", fg: "#085041" },
  { bg: "#FAC775", fg: "#633806" },
  { bg: "#F4C0D1", fg: "#72243E" },
  { bg: "#CECBF6", fg: "#3C3489" },
  { bg: "#C0DD97", fg: "#3B6D11" },
  { bg: "#F9C784", fg: "#7C4A00" },
  { bg: "#A8D8EA", fg: "#1A5276" },
  { bg: "#F7CAC9", fg: "#922B21" },
  { bg: "#B7EACB", fg: "#1E8449" },
];

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

const paletteFor = (s = "") => PALETTE[(s.charCodeAt(0) || 0) % PALETTE.length];

function Avatar({ name = "", avatarpath = null, size = "sm" }) {
  const [err, setErr] = useState(false);
  const c = paletteFor(name);

  if (avatarpath && !err) {
    return (
      <img
        src={avatarpath}
        alt={name}
        className={`${styles.avatar_base} ${styles[`avatar_${size}`]}`}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div
      className={`${styles.avatar_base} ${styles[`avatar_${size}`]}`}
      style={{ background: c.bg, color: c.fg }}
    >
      {getInitials(name)}
    </div>
  );
}

function AvatarStack({ leader = null, members = [], total = 0 }) {
  const all   = [leader, ...members].filter(Boolean);
  const shown = all.slice(0, 4);
  const extra = total - shown.length;

  return (
    <div className={styles.avatar_stack}>
      {shown.map((m, i) => (
        <Avatar
          key={m?.user_id ?? i}
          name={m?.fullname || m?.username}
          avatarpath={m?.avatarpath}
          size="xs"
        />
      ))}
      {extra > 0 && <div className={styles.avatar_more}>+{extra}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TOAST SYSTEM
// ─────────────────────────────────────────────────────────────
let _tid = 0;

function useToast() {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((msg, type = "success") => {
    const id = ++_tid;
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3200);
  }, []);

  return { toasts, push };
}

function ToastStack({ toasts }) {
  return (
    <div className={styles.toast_stack}>
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`${styles.toast} ${styles[`toast_${t.type}`]}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.22 }}
          >
            <span className={styles.toast_icon}>
              {t.type === "success" ? <MdCheck /> : <MdErrorOutline />}
            </span>
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CREATE GROUP MODAL
// ─────────────────────────────────────────────────────────────
function CreateGroupModal({ onClose, onCreated }) {
  const [name,    setName]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const submit = async () => {
    if (!name.trim()) { setError("Tên nhóm không được để trống"); return; }
    setLoading(true);
    setError("");
    try {
      const res  = await apiFetch(`/groups/create/`, {
        method:  "POST",
        headers: {
        },
        body:    JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        onCreated(data.group_uuid);
      } else {
        setError(
          data?.message?.[0] ||
          "Tạo nhóm thất bại, vui lòng thử lại"
        );
      }
    } catch {
      setError("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modal_overlay} onClick={onClose}>
      <motion.div
        className={styles.modal_box}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0,   scale: 1    }}
        exit={{    opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className={styles.modal_header}>
          <div className={styles.modal_title_group}>
            <AiOutlineTeam className={styles.modal_icon} />
            <span className={styles.modal_title}>Tạo nhóm mới</span>
          </div>
          <button className={styles.modal_close} onClick={onClose}>
            <MdClose />
          </button>
        </div>

        <div className={styles.modal_body}>
          <label className={styles.modal_label}>Tên nhóm</label>
          <input
            className={styles.modal_input}
            placeholder="VD: Nhóm Phát triển Web..."
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
          />
          {error && (
            <div className={styles.modal_error}>
              <MdErrorOutline /> {error}
            </div>
          )}
        </div>

        <div className={styles.modal_footer}>
          <button className={styles.modal_btn_cancel} onClick={onClose}>
            Hủy
          </button>
          <button
            className={styles.modal_btn_submit}
            onClick={submit}
            disabled={loading}
          >
            <BsFillBookmarkPlusFill />
            {loading ? "Đang tạo..." : "Tạo nhóm"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ADD MEMBER MODAL
// ─────────────────────────────────────────────────────────────
function AddMemberModal({ group, onClose, onSuccess }) {
  const [username, setUsername] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const submit = async () => {
    if (!username.trim()) { setError("Vui lòng nhập username"); return; }
    setLoading(true);
    setError("");
    try {
      const res  = await apiFetch(
        `/groups/${group.uuid}/add_member/`,
        {
          method:  "POST",
          headers:{},
          body:    JSON.stringify({ username: username.trim() }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError(data?.error || "Có lỗi xảy ra");
      }
    } catch {
      setError("Có lỗi xảy ra! Vui lòng kiển tra lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modal_overlay} onClick={onClose}>
      <motion.div
        className={styles.modal_box}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0,   scale: 1    }}
        exit={{    opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className={styles.modal_header}>
          <div className={styles.modal_title_group}>
            <MdOutlinePersonAdd className={styles.modal_icon} />
            <div>
              <span className={styles.modal_title}>Thêm thành viên</span>
              <span className={styles.modal_subtitle}>{group.group_name}</span>
            </div>
          </div>
          <button className={styles.modal_close} onClick={onClose}>
            <MdClose />
          </button>
        </div>

        <div className={styles.modal_body}>
          <label className={styles.modal_label}>Username</label>
          <input
            className={styles.modal_input}
            placeholder="Nhập username của thành viên..."
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
          />
          {error && (
            <div className={styles.modal_error}>
              <MdErrorOutline /> {error}
            </div>
          )}
        </div>

        <div className={styles.modal_footer}>
          <button className={styles.modal_btn_cancel} onClick={onClose}>
            Hủy
          </button>
          <button
            className={styles.modal_btn_submit}
            onClick={submit}
            disabled={loading}
          >
            <MdOutlinePersonAdd />
            {loading ? "Đang thêm..." : "Thêm ngay"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SEARCH RESULT CARD
// ─────────────────────────────────────────────────────────────
function SearchResultCard({ item, index }) {
  const [requested, setRequested] = useState(false);

  const requestJoinGroup = async () => {
    try {
      const res = await apiFetch(`/request/${item.uuid}/create/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        const message =
          data.detail ||
          data.group?.[0] ||
          Object.values(data)[0]?.[0] ||
          "Có lỗi xảy ra";

        alert(message);
        console.log("DRF ERROR:", data);
        setRequested(true)
        return;
      }

      alert(data.message || "Thành công");
      console.log("SUCCESS:", data);

    } catch (err) {
      console.error("NETWORK ERROR:", err);
      alert("Lỗi kết nối server!");
    }
  };
  // function requestJoinGroup() {
  //   return apiFetch(`/request/${item.uuid}/create/`, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({}),
  //   }).then(res => {
  //     if (!res.ok) {
  //       setRequested(true)
  //       return res.json().then(err => {
  //         throw err;
          
  //       });
  //     }
  //     return res.json();
  //   });
  // }
  return (
    <motion.div
      className={styles.card_result}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0  }}
      transition={{ delay: index * 0.06, duration: 0.2 }}
    >
      <div className={styles.cr_top}>
        <div className={styles.cr_info}>
          <span className={styles.cr_name}>{item.name}</span>
          <span className={styles.cr_id}>
            #{String(item.uuid).split("-")[0]}
          </span>
        </div>
        <button
          className={`${styles.btn_join} ${requested ? styles.cancel : styles.join}`}
          onClick={requestJoinGroup}
        >
          {requested ? "Hủy yêu cầu" : "Gửi yêu cầu"}
        </button>
      </div>

      <div className={styles.cr_stats}>
        <span className={styles.cr_stat}>
          <MdOutlinePeople /> {item.member_count} thành viên
        </span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// GROUP CARD
// ─────────────────────────────────────────────────────────────
function GroupCard({ item, index, onAddMember, onClick }) {
  const totalMembers = (item.members?.length ?? 0) + 1;   // +1 = leader
  const projectCount = item.projects?.length ?? 0;

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0  }}
      transition={{ delay: index * 0.05,ease: "easeOut" }}
      onClick={onClick}
    >
      {/* ── Header ── */}
      <div className={styles.cg_header}>
        <div className={styles.cg_title_block}>
          <span className={styles.cg_name}>{item.group_name}</span>
          <span className={styles.cg_id}>
            #{String(item.uuid).split("-")[0]}
          </span>
        </div>

        <div className={styles.cg_header_right}>
          {item.is_leader ? (
            <>
              <span className={styles.role_badge_leader}>Leader</span>
              <button
                className={styles.btn_add_member}
                onClick={(e) => { e.stopPropagation(); onAddMember(item); }}
              >
                <MdOutlinePersonAdd />
                Thêm
              </button>
            </>
          ) : (
            <span className={styles.role_badge_member}>Thành viên</span>
          )}
        </div>
      </div>

      {/* ── Leader row ── */}
      <div className={styles.cg_leader_row}>
        <Avatar
          name={item.leader?.fullname || item.leader?.username}
          avatarpath={item.leader?.avatarpath}
          size="md"
        />
        <div className={styles.leader_detail}>
          <span className={styles.leader_fullname}>
            {item.leader?.fullname || item.leader?.username}
          </span>
          <span className={styles.leader_role}>Trưởng nhóm</span>
        </div>
      </div>

      {/* ── Member stack ── */}
      <div className={styles.cg_members_row}>
        <AvatarStack
          leader={item.leader}
          members={item.members ?? []}
          total={totalMembers}
        />
        <span className={styles.members_label}>{totalMembers} thành viên</span>
      </div>

      {/* ── Stats ── */}
      <div className={styles.cg_stats}>
        <div className={styles.stat_box}>
          <MdOutlinePeople className={styles.stat_icon} />
          <span className={styles.stat_val}>{totalMembers}</span>
          <span className={styles.stat_lbl}>Thành viên</span>
        </div>
        <div className={styles.stat_box}>
          <MdOutlineFolder className={styles.stat_icon} />
          <span className={styles.stat_val}>{projectCount}</span>
          <span className={styles.stat_lbl}>Dự án</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
function Groups() {
  const [groups,        setGroups]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState("all");
  const [sortMode,      setSortMode]      = useState("newest");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching,     setSearching]     = useState(false);
  const [showCreate,    setShowCreate]    = useState(false);
  const [addTarget,     setAddTarget]     = useState(null);   // group to add member to

  const { toasts, push } = useToast();
  const navigate         = useNavigate();
  const searchTimer      = useRef(null);

  // ── Fetch groups ──────────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/groups/my-groups/`, {
        headers: {
        },
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      } else {
        push("Không thể tải danh sách nhóm", "error");
      }
    } catch {
      push("Lỗi kết nối server", "error");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { fetchGroups(); }, [fetchGroups]);



  const handleSearch = async () => {
    const q = searchQuery.trim();

    if (!q || q === "#") {
      setSearchResults([]);
      return;
    }

    setSearching(true);

    try {
      const res = await apiFetch(`/groups/search/`, {
        method: "POST",
        headers: {},
        body: JSON.stringify({ keyword: q }),
      });

      const data = await res.json();
      setSearchResults(data ?? []);
      console.log("RESULT", data)
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // ── After create ──────────────────────────────────────────
  const handleCreated = async () => {
    setShowCreate(false);
    push("Nhóm đã được tạo thành công 🎉");
    await fetchGroups();
  };

  // ── After add member ─────────────────────────────────────
  const handleMemberAdded = () => {
    push("Đã thêm thành viên vào nhóm ✓");
    fetchGroups();
  };

  // ── Navigate to detail ────────────────────────────────────
  const handleNavigate = (uuid) => {
    navigate(`/group-detail/${uuid}`);
  };

  // ── Filter + sort ─────────────────────────────────────────
  const displayed = [...groups]
    .filter((g) =>
      activeTab === "manage" ? g.is_leader  :
      activeTab === "joined" ? !g.is_leader :
      true
    )
    .sort((a, b) => {
      const da = new Date(a.created_at ?? 0);
      const db = new Date(b.created_at ?? 0);
      return sortMode === "newest" ? db - da : da - db;
    });

  const searchMode = searchQuery.startsWith("#") ? "uuid" : "name";

  return (
    <div className={styles.page}>

      {/* ── TOASTS ── */}
      <ToastStack toasts={toasts} />

      {/* ── MODALS ── */}
      <AnimatePresence>
        {showCreate && (
          <CreateGroupModal
            onClose={() => setShowCreate(false)}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {addTarget && (
          <AddMemberModal
            group={addTarget}
            onClose={() => setAddTarget(null)}
            onSuccess={handleMemberAdded}
          />
        )}
      </AnimatePresence>

      {/* ══ LEFT PANEL ══ */}
      <div className={styles.left_container}>

        {/* Manage tabs + create */}
        <div className={`${styles.left_top_container} ${styles.base_layout}`}>
          <div className={styles.label}>
            <AiOutlineTeam className={styles.large_icon} />
            <h3>Quản lý nhóm của bạn</h3>
          </div>

          <div className={styles.left_top_button_container}>
            {[
              { key: "all",    label: "Tất cả"  },
              { key: "manage", label: "Quản lý" },
              { key: "joined", label: "Tham gia"},
            ].map(({ key, label }) => (
              <button
                key={key}
                className={activeTab === key ? styles.activeTab : styles.inactiveTab}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
            <BsFillBookmarkPlusFill />
            Tạo nhóm
          </button>
        </div>

        {/* Search */}
        <div className={`${styles.left_bottom_container} ${styles.base_layout}`}>
          <div className={styles.label2}>
            <HiSearchCircle className={styles.large_icon} />
            <h3>Tìm kiếm nhóm</h3>
          </div>

          <div className={`${styles.searchBar} ${searchQuery ? styles.searchBar_active : ""}`}>
            <FaSearch className={styles.search_icon} />
            <input
              type="text"
              placeholder='Tên nhóm hoặc #uuid...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {searching && <span className={styles.search_spinner} />}
            {searchQuery && (
              <button
                className={styles.search_clear}
                onClick={() => 
                {
                  setSearchQuery("")
                  setSearchResults([])
                }}
              >
                <MdClose />
              </button>
            )}
            <button
              className={styles.search_btn}
              onClick={handleSearch}
              disabled={searching}
            >
              <FaSearch />
            </button>
          </div>

          {searchQuery && (
            <div className={styles.search_mode_pill}>
              {searchMode === "uuid"
                ? "🔑 Tìm theo UUID"
                : "🔤 Tìm theo tên nhóm"}
            </div>
          )}

          <div className={styles.result_header}>
            <span>
              {searchQuery
                ? searching
                  ? "Đang tìm kiếm..."
                  : `${searchResults.length} kết quả`
                : "Nhập để tìm kiếm"}
            </span>
          </div>

          <div className={styles.result}>
            {searchResults.map((item, index) => (
              <SearchResultCard key={item.uuid} item={item} index={index} />
            ))}
            {searchQuery && !searching && searchResults.length === 0 && (
              <div className={styles.empty_state}>
                Không tìm thấy nhóm nào 🫙
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div className={styles.right_container}>
        <div className={styles.right_header}>
          <div className={styles.right_title}>
            <h3>Danh sách nhóm</h3>
            <span>{displayed.length} nhóm</span>
          </div>

          <button
            className={styles.sortBtn}
            onClick={() => setSortMode(sortMode === "newest" ? "oldest" : "newest")}
          >
            {sortMode === "newest" ? (
              <><LiaSortAmountDownAltSolid /> Mới nhất</>
            ) : (
              <><LiaSortAmountUpSolid /> Cũ nhất</>
            )}
          </button>
        </div>

        <div className={styles.group_list}>
          {loading && (
            <div className={styles.loading_state}>
              <span className={styles.loading_spinner} />
              Đang tải danh sách nhóm...
            </div>
          )}

          {!loading && displayed.length === 0 && (
            <div className={styles.empty_full}>
              <AiOutlineTeam style={{ fontSize: 40, opacity: 0.2 }} />
              <span>Chưa có nhóm nào</span>
              <button
                className={styles.createBtn}
                style={{ width: "auto", padding: "8px 20px" }}
                onClick={() => setShowCreate(true)}
              >
                <BsFillBookmarkPlusFill /> Tạo nhóm đầu tiên
              </button>
            </div>
          )}

          {!loading && displayed.map((item, index) => (
            <GroupCard
              key={item.uuid}
              item={item}
              index={index}
              onAddMember={(g) => setAddTarget(g)}
              onClick={() => handleNavigate(item.uuid)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Groups;
