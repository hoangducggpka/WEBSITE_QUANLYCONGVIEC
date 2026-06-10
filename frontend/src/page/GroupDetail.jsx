// GroupDetail.jsx
import styles from "./GroupDetail.module.css";
import { IoMdArrowRoundBack } from "react-icons/io";
import { usePresence } from "../context/PresenceContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CiLogout } from "react-icons/ci";
import { apiFetch } from "../utils/api";

import {
  MdOutlinePersonAdd,
  MdOutlineDelete,
  MdOutlineFolder,
  MdOutlinePeople,
  MdOutlineTask,
  MdOutlineChat,
  MdOutlineCheckCircle,
  MdOutlineCancel,
  MdOutlineClose,
  MdOutlineSearch,
  MdOutlineInbox,
  MdOutlineAdminPanelSettings,
} from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";

// ─── HELPERS ─────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: "#B5D4F4", color: "#0C447C" },
  { bg: "#9FE1CB", color: "#085041" },
  { bg: "#FAC775", color: "#633806" },
  { bg: "#F4C0D1", color: "#72243E" },
  { bg: "#CECBF6", color: "#3C3489" },
  { bg: "#C0DD97", color: "#3B6D11" },
  { bg: "#F5C4B3", color: "#993C1D" },
  { bg: "#D3D1C7", color: "#444441" },
];

const getInitials = (name = "") =>
  name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();

const getColor = (id) => AVATAR_COLORS[(id ?? 0) % AVATAR_COLORS.length];

// Map status từ BE sang label hiển thị
const PROJECT_STATUS_LABEL = {
  preparing:   "Chuẩn bị",
  ongoing:     "Đang thực hiện",
  completed:   "Hoàn thành",
  pending:     "Chờ duyệt",
};

// ─── SUB COMPONENTS ───────────────────────────────────────────
function Avatar({ name, avatarpath, colorId, size = "md" }) {
  const [imgError, setImgError] = useState(false);
  const c = getColor(colorId);

  return (
    <div
      className={`${styles.avatar} ${styles[`avatar_${size}`]}`}
      style={{ background: c.bg, color: c.color }}
    >
      {avatarpath && !imgError ? (
        <img
          src={avatarpath}
          alt={name}
          className={styles.avatar_img}
          onError={() => setImgError(true)}
        />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

function OnlineDot({ online }) {
  return (
    <span
      className={`${styles.dot} ${online ? styles.dot_online : styles.dot_offline}`}
    />
  );
}

function Modal({ title, onClose, children }) {
  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.modal}
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modal_header}>
            <h3>{title}</h3>
            <button className={styles.modal_close} onClick={onClose}>
              <MdOutlineClose />
            </button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
// ─── MAIN COMPONENT ───────────────────────────────────────────
function GroupDetail() {
  const navigate = useNavigate();
  const { uuid } = useParams(); // UUID nhóm lấy từ URL

  // ── State ──
  const [loading, setLoading]       = useState(true);
  const [group, setGroup]           = useState(null);   // { uuid, name, color, is_leader, description, members_count, projects_count, tasks_count }
  const [leader, setLeader]         = useState(null);   // { user_id, fullname, username, avatarpath }
  const [members, setMembers]       = useState([]);     // [{ user_id, fullname, username, user_code, avatarpath, role }]
  const [projects, setProjects]     = useState([]);     // [{ uuid, name, status, progress, tasks }]
  const [requests, setRequests]     = useState([]);     // [{ uuid, fullname, user_code, created_at }]
  // const [onlineUsers, setOnlineUsers] = useState([]);   // [user_id, ...]

  const [selected, setSelected]     = useState([]);
  const [search, setSearch]         = useState("");
  const [modal, setModal]           = useState(null);   // null | "add" | "requests"
  const [username, setUsername]     = useState("");     // input thêm thành viên

  const { onlineUsers } = usePresence();
  console.log("ONLINE USERS:", onlineUsers);
  
  // ── Load dữ liệu nhóm ──
  const loadGroup = async () => {
    try {
      setLoading(true);

      const res = await apiFetch(`/groups/${uuid}/detail/`, { method: "GET" });
      const data = await res.json();

      if (!res.ok) {
        // Log lỗi từ BE (detail / error / non_field_errors ...)
        console.error("[GroupDetail] BE error:", data);
        return;
      }

      // ── group info ──
      setGroup(data.group);

      // ── leader + members gộp thành 1 danh sách với field role ──
      const leaderData = data.leader
        ? { ...data.leader, role: "leader" }
        : null;

      setLeader(leaderData);

      const memberList = (data.members || []).map((m) => ({
        ...m,
        role: "member",
      }));

      // Danh sách đầy đủ: leader đầu tiên, rồi đến members
      setMembers(leaderData ? [leaderData, ...memberList] : memberList);

      setProjects(data.projects || []);
      setRequests(data.requests || []);
    } catch (err) {
      console.error("[GroupDetail] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (uuid) loadGroup();
  }, [uuid]);

  // ── WebSocket presence ──
  const wsRef = useRef(null); // giữ instance qua StrictMode double-mount

  // useEffect(() => {
  //   if (!uuid) return;

  //   // Đóng WS cũ nếu còn tồn tại (StrictMode mount lại)
  //   if (wsRef.current) {
  //     wsRef.current.close();
  //     wsRef.current = null;
  //   }

  //   const token = localStorage.getItem("access");
  //   const wsUrl = `ws://127.0.0.1:8000/ws/groups/${uuid}/?token=${token}`;

  //   const ws = new WebSocket(wsUrl);
  //   wsRef.current = ws;

  //   ws.onopen = () => {
  //     console.log("[WS] Connected:", wsUrl);
  //   };

  //   ws.onmessage = (event) => {
  //     // Log raw để debug — xem BE đang gửi type gì
  //     console.log("[WS] Raw message:", event.data);

  //     let data;
  //     try {
  //       data = JSON.parse(event.data);
  //     } catch (e) {
  //       console.error("[WS] JSON parse error:", e);
  //       return;
  //     }

  //     console.log("[WS] Parsed:", data);

  //     if (data.type === "presence_update") {
  //       // consumer mới: { type: "presence_update", online_users: [user_id, ...] }
  //       setOnlineUsers(data.online_users ?? []);
  //     } else if (data.type === "presence") {
  //       // consumer cũ: { type: "presence", user_id, status: "online"|"offline" }
  //       // fallback để tương thích nếu BE chưa deploy consumer mới
  //       setOnlineUsers((prev) => {
  //         if (data.status === "online") {
  //           return prev.includes(data.user_id) ? prev : [...prev, data.user_id];
  //         } else {
  //           return prev.filter((id) => id !== data.user_id);
  //         }
  //       });
  //     }
  //   };

  //   ws.onerror = (e) => console.error("[WS] Error:", e);
  //   ws.onclose = (e) => console.log("[WS] Closed, code:", e.code, "clean:", e.wasClean);

  //   return () => {
  //     ws.close();
  //     wsRef.current = null;
  //   };
  // }, [uuid]);

  // ── Filter members theo search ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        (m.fullname || "").toLowerCase().includes(q) ||
        (m.username || "").toLowerCase().includes(q) ||
        (m.user_code || "").toLowerCase().includes(q)
    );
  }, [members, search]);

  // Hàm rời nhóm
  const handleLeaveGroup = async () => {
    const confirmLeave = window.confirm("Bạn có chắc muốn rời nhóm không?");
    if (!confirmLeave) return;

    try {

      const res = await apiFetch(
        `/groups/${uuid}/leave/`,
        {
          method: "POST",
          headers: {
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Có lỗi xảy ra!");
        return;
      }

      alert(data.message || "Rời nhóm thành công!");

      loadGroup();

    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối server!");
    }
  };

  // ── Chọn hàng ──
  const toggleSelect = (userId) =>
    setSelected((s) =>
      s.includes(userId) ? s.filter((x) => x !== userId) : [...s, userId]
    );

  const toggleAll = () =>
    setSelected(
      selected.length === filtered.length && filtered.length > 0
        ? []
        : filtered.map((m) => m.user_id)
    );

  // ── Duyệt / từ chối yêu cầu (local state; gọi API nếu cần) ──
  const handleRequest = (reqUuid) => {
    const req = requests.find((r) => r.uuid === reqUuid);
    if (req) {
      // Reload để lấy member mới từ server sau khi duyệt
      setRequests((rs) => rs.filter((r) => r.uuid !== reqUuid));
      loadGroup();
    }
  };

  const approveRequest = async (request_uuid) => {
    if (!window.confirm("Bạn có chắc chắn muốn duyệt yêu cầu này?")) {
      return;
    }
    try {
      const res = await apiFetch(
        `/request/approve/${request_uuid}/`,
        {
          method: "PATCH",
          headers: {
          },
        }
      );

      const data = await res.json();

      if (res.ok) {
        alert("Duyệt thành công");
        const req = requests.find((r) => r.uuid === request_uuid);
        if (req) {
          // Reload để lấy member mới từ server sau khi duyệt
          setRequests((rs) => rs.filter((r) => r.uuid !== request_uuid));
          setModal(null)
          loadGroup();
        }

      } else {
        alert(data.error || "Duyệt thất bại");
      }
    } catch (err) {
      alert("Network error: " + err.message);
    }
  };

  function rejectRequest(requestUuid) {
    if (!window.confirm("Bạn có chắc chắn muốn từ chối yêu cầu này?")) {
      return;
    }

    apiFetch(`/request/reject/${requestUuid}/`, {
      method: "DELETE",
      headers: {
      },
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw err; });
        }
        return res.json();
      })
      .then(data => {
        console.log("Đã từ chối yêu cầu", data);
        // cập nhật lại danh sách requests sau khi reject
        const req = requests.find((r) => r.uuid === requestUuid);
        if (req) {
          // Reload để lấy member mới từ server sau khi duyệt
          setRequests((rs) => rs.filter((r) => r.uuid !== requestUuid));
          setModal(null)
          loadGroup();
        }

      })
      .catch(err => {
        console.error("Error:", err);
        alert("Có lỗi xảy ra khi từ chối yêu cầu.");
      });
    

  }
  const reject = (reqUuid) =>{
    
    setRequests((rs) => rs.filter((r) => r.uuid !== reqUuid));
  }
  // ── Thêm thành viên ──
  const handleAddMember = async () => {
    try {
      const res = await apiFetch(`/groups/${uuid}/add_member/`, {
        method: "POST",
        body: JSON.stringify({ username }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("[GroupDetail] Add member error:", data);
        return;
      }

      setModal(null);
      setUsername("");
      loadGroup();
    } catch (err) {
      console.error("[GroupDetail] Add member fetch error:", err);
    }
  };

  // ── Kick 1 thành viên ──
  const kickMember = async (userId) => {
    try {
      const res = await apiFetch(`/groups/${uuid}/kick/`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("[GroupDetail] Kick error:", data);
        return;
      }

      loadGroup();
    } catch (err) {
      console.error("[GroupDetail] Kick fetch error:", err);
    }
  };

  // ── Kick nhiều thành viên đã chọn ──
  const deleteSelected = async () => {
    try {
      const results = await Promise.all(
        selected.map((userId) =>
          apiFetch(`/groups/${uuid}/kick/`, {
            method: "POST",
            body: JSON.stringify({ user_id: userId }),
          })
        )
      );

      // Log từng lỗi nếu có
      for (const res of results) {
        if (!res.ok) {
          const err = await res.json();
          console.error("[GroupDetail] Bulk kick error:", err);
        }
      }

      setSelected([]);
      loadGroup();
    } catch (err) {
      console.error("[GroupDetail] Bulk kick fetch error:", err);
    }
  };

  // ── CSS class cho trạng thái project ──
  const projectStatusClass = (status) => {
    if (status === "completed") return styles.proj_done;
    if (status === "pending")   return styles.proj_wait;
    return styles.proj_active;
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className={styles.page} style={{ alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#9ca3af", fontSize: 14 }}>Đang tải...</span>
      </div>
    );
  }

  // ── Không tìm thấy nhóm ──
  if (!group) {
    return (
      <div className={styles.page} style={{ alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#ef4444", fontSize: 14 }}>Không tìm thấy nhóm.</span>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── TOP PANEL ── */}
      <motion.div
        className={`${styles.top_container} ${styles.base_layout}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* Nút quay lại */}
        <button
          className={styles.backBtn}
          onClick={() => {
            localStorage.removeItem("group_page_last_route");
            navigate("/groups");
          }}
        >
          <IoMdArrowRoundBack className={styles.back_icon} />
        </button>

        {/* Thông tin nhóm */}
        <div className={styles.group_info}>
          <div className={styles.group_avatar}>
            <MdOutlinePeople />
          </div>
          <div className={styles.group_text}>
            {/* data.group.name */}
            <h2 className={styles.group_name}>{group.name}</h2>
            {/* data.group.description (hiện tại BE trả về rỗng) */}
            <p className={styles.group_desc}>
              {group.description || "Chưa có mô tả"}
            </p>
          </div>
        </div>

        {/* Stats + Actions */}
        <div className={styles.top_right}>
          <div className={styles.stat_chips}>
            <div className={styles.chip}>
              <MdOutlinePeople className={styles.chip_icon} />
              {/* data.group.members_count = số member + 1 (leader) */}
              <span>{group.members_count} thành viên</span>
            </div>
            <div className={styles.chip}>
              <MdOutlineFolder className={styles.chip_icon} />
              {/* data.group.projects_count */}
              <span>{group.projects_count} dự án</span>
            </div>
            <div className={styles.chip}>
              <MdOutlineTask className={styles.chip_icon} />
              {/* data.group.tasks_count */}
              <span>{group.tasks_count} nhiệm vụ</span>
            </div>
          </div>

          <div className={styles.action_row}>
            <button
              className={styles.btn_projects}
              onClick={() => navigate("/projects")}
            >
              <MdOutlineFolder /> Dự án nhóm
            </button>

            <button
              className={styles.btn_requests}
              onClick={() => setModal("requests")}
            >
              <MdOutlineInbox />
              Yêu cầu tham gia
              {requests.length > 0 && (
                <span className={styles.badge_count}>{requests.length}</span>
              )}
            </button>

            <button
              className={styles.btn_chat}
              onClick={() => navigate("/messages")}
            >
              <MdOutlineChat />
              Nhóm chat
            </button>
            <button
              className={styles.btn_leave}
              onClick={handleLeaveGroup}
            >
              <CiLogout  />
              Rời nhóm
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── BOTTOM PANEL ── */}
      <motion.div
        className={`${styles.bottom_container} ${styles.base_layout}`}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.06 }}
      >
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.search_wrap}>
            <MdOutlineSearch className={styles.search_icon} />
            <input
              type="text"
              placeholder="Tìm theo tên, username, mã sinh viên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.toolbar_actions}>
            {selected.length > 0 && (
              <motion.button
                className={styles.btn_delete}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={deleteSelected}
              >
                <MdOutlineDelete /> Xóa ({selected.length})
              </motion.button>
            )}
            <button className={styles.btn_add} onClick={() => setModal("add")}>
              <MdOutlinePersonAdd /> Thêm thành viên
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.table_wrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th_check}>
                  <input
                    type="checkbox"
                    checked={
                      selected.length === filtered.length &&
                      filtered.length > 0
                    }
                    onChange={toggleAll}
                  />
                </th>
                <th>Thành viên</th>
                <th>Mã sinh viên</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => {
                // onlineUsers là mảng user_id (số), so sánh với m.user_id
                // const isOnline = onlineUsers.includes(member.id);
                const isOnline = onlineUsers.includes(m.user_id);
                console.log("MEMBER:", m);
                return (
                  <motion.tr
                    key={m.user_id}
                    className={`${styles.row} ${
                      selected.includes(m.user_id) ? styles.row_selected : ""
                    }`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <td className={styles.td_check}>
                      {/* Leader không cho chọn để xóa */}
                      {m.role !== "leader" && (
                        <input
                          type="checkbox"
                          checked={selected.includes(m.user_id)}
                          onChange={() => toggleSelect(m.user_id)}
                        />
                      )}
                    </td>

                    <td>
                      <div className={styles.member_cell}>
                        <div className={styles.avatar_wrap}>
                          {/* Dùng fullname để lấy initials, user_id để lấy màu */}
                          <Avatar
                            name={m.fullname}
                            avatarpath={m.avatarpath}
                            colorId={m.user_id}
                            size="sm"
                          />
                          <OnlineDot online={isOnline} />
                        </div>
                        {/* data.leader.fullname / data.members[].fullname */}
                        <span className={styles.member_name}>{m.fullname}</span>
                      </div>
                    </td>

                    <td>
                      {/* leader không có user_code trong response hiện tại */}
                      <span className={styles.code_chip}>
                        {m.user_code || m.username || "—"}
                      </span>
                    </td>

                    <td>
                      {m.role === "leader" ? (
                        <span className={styles.role_leader}>
                          <MdOutlineAdminPanelSettings /> Trưởng nhóm
                        </span>
                      ) : (
                        <span className={styles.role_member}>Thành viên</span>
                      )}
                    </td>

                    <td>
                      <span
                        className={
                          isOnline ? styles.status_online : styles.status_offline
                        }
                      >
                        {isOnline ? "Online" : "Offline"}
                      </span>
                    </td>

                    <td>
                      {m.role !== "leader" && (
                        <button
                          className={styles.btn_row_del}
                          onClick={() => kickMember(m.user_id)}
                        >
                          <MdOutlineDelete />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className={styles.empty}>Không tìm thấy thành viên nào</div>
          )}
        </div>

        {/* Projects quick list */}
        <div className={styles.proj_section}>
          <h4 className={styles.proj_title}>Dự án nhóm</h4>
          <div className={styles.proj_list}>
            {projects.length === 0 && (
              <span style={{ fontSize: 13, color: "#9ca3af" }}>
                Chưa có dự án nào
              </span>
            )}
            {projects.map((p) => (
              <button
                key={p.uuid}
                className={styles.proj_card}
                onClick={() => navigate(`/projects/${p.uuid}`)}
              >
                <MdOutlineFolder className={styles.proj_icon} />
                <div className={styles.proj_info}>
                  {/* data.projects[].name */}
                  <span className={styles.proj_name}>{p.name}</span>
                  {/* data.projects[].tasks (số nhiệm vụ) */}
                  <span className={styles.proj_tasks}>{p.tasks} nhiệm vụ</span>
                </div>
                {/* data.projects[].status: "preparing" | "ongoing" | "completed" | "pending" */}
                <span
                  className={`${styles.proj_status} ${projectStatusClass(p.status)}`}
                >
                  {PROJECT_STATUS_LABEL[p.status] ?? p.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── MODAL: THÊM THÀNH VIÊN ── */}
      {modal === "add" && (
        <Modal title="Thêm thành viên mới" onClose={() => setModal(null)}>
          <div className={styles.modal_body}>
            <div className={styles.form_group}>
              {/* BE nhận { username } → POST /groups/<uuid>/add_member/ */}
              <label>Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập username..."
                onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
              />
            </div>
            <div className={styles.modal_footer}>
              <button
                className={styles.btn_cancel_modal}
                onClick={() => {
                  setModal(null);
                  setUsername("");
                }}
              >
                Hủy
              </button>
              <button
                className={styles.btn_confirm}
                onClick={handleAddMember}
                disabled={!username.trim()}
              >
                <MdOutlinePersonAdd /> Thêm
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: YÊU CẦU THAM GIA ── */}
      {modal === "requests" && (
        <Modal
          title={`Yêu cầu tham gia (${requests.length})`}
          onClose={() => setModal(null)}
        >
          <div className={styles.modal_body}>
            {requests.length === 0 ? (
              <div className={styles.empty}>Không có yêu cầu nào</div>
            ) : (
              requests.map((r) => (
                <div key={r.uuid} className={styles.req_item}>
                  <div className={styles.member_cell}>
                    {/* data.requests[].fullname */}
                    <Avatar
                      name={r.fullname}
                      avatarpath={r.avatarpath}
                      colorId={r.uuid?.charCodeAt(0)}
                      size="sm"
                    />
                    <div className={styles.req_info}>
                      <span className={styles.member_name}>{r.fullname}</span>
                      {/* data.requests[].user_code + created_at */}
                      <span className={styles.req_code}>
                        {r.user_code}
                        {r.created_at
                          ? ` · ${new Date(r.created_at).toLocaleDateString("vi-VN")}`
                          : ""}
                      </span>
                    </div>
                  </div>
                  <div className={styles.req_actions}>
                    <button
                      className={styles.btn_approve}
                      onClick={() => approveRequest(r.uuid)}
                    >
                      <MdOutlineCheckCircle /> Duyệt
                    </button>
                    <button
                      className={styles.btn_reject}
                      onClick={() => rejectRequest(r.uuid)}
                    >
                      <MdOutlineCancel /> Từ chối
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default GroupDetail;