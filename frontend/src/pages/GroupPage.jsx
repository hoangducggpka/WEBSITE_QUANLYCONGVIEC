import React, { useState, useEffect, useMemo } from "react";
import styles from "./GroupPage.module.css";
import Group from "../components/Group";
import { apiFetch } from "../utils/api";

const BASE_URL = "http://127.0.0.1:8000";

const GroupPage = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGroupUuid, setSelectedGroupUuid] = useState(null);
  const [newMember, setNewMember] = useState("");

  const handleDeleteGroup = async (uuid) => {
    const access = localStorage.getItem("access");

    const confirmDelete = window.confirm("Bạn có chắc muốn xóa nhóm này không?");
    if (!confirmDelete) return;

    try {
      const res = await apiFetch(
        `/groups/${uuid}/delete/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${access}`
          }
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Xóa nhóm thất bại!");
        return;
      }

      alert(data.message || "Xóa nhóm thành công!");
      fetchGroups();


    } catch (err) {
      console.error(err);
      alert("Lỗi server!");
    }
  };

  const handleLeaveGroup = async (groupUuid) => {
    const confirmLeave = window.confirm("Bạn có chắc muốn rời nhóm không?");
    if (!confirmLeave) return;

    try {
      const token = localStorage.getItem("access");

      const res = await apiFetch(
        `/groups/${groupUuid}/leave/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Có lỗi xảy ra!");
        return;
      }

      alert(data.message || "Rời nhóm thành công!");

      fetchGroups();

    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối server!");
    }
  };
  const fetchGroups = async () => {
    try {
      const access = localStorage.getItem("access");

      const res = await apiFetch(
        "/groups/my-groups/",
        {
          headers: {
            Authorization: `Bearer ${access}`,
          },
        }
      );

      if (!res.ok) throw new Error("Không thể tải danh sách nhóm");

      const data = await res.json();

      console.log(data);
      // transform data
      const formatted = data.map((group) => {
        return {
          // id: group.group_name,
          title: group.group_name,
          uuid:group.uuid,
          leader: group.leader.username,
          leaderAvatar: group.leader.avatarpath
            ? `${group.leader.avatarpath}`
            : null,
          membersCount: group.members.length,
          avatarUrl: group.members
            .map((m) =>
              m.avatarpath ? `${m.avatarpath}` : null
            )
            .filter(Boolean),
          filesCount: group.projects.length,
          color: group.color,
          isLeader: group.is_leader, // 👈 dùng trực tiếp
        };
      });

      setGroups(formatted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // filter logic
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      // filter tab
      if (activeTab === "managing" && g.isLeader !== true) {
        return false;
      }

      if (activeTab === "participating" && g.isLeader === true) {
        return false;
      }

      // filter search
      if (
        searchTerm.trim() !== "" &&
        !g.title.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [groups, activeTab, searchTerm]);

  const handleOpenAddMember = (uuid) => {
    setSelectedGroupUuid(uuid);
    setShowAddModal(true);
  };
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      setCreating(true);

      const access = localStorage.getItem("access");

      const res = await apiFetch(
        "/groups/create/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access}`,
          },
          body: JSON.stringify({ name: newGroupName }),
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(JSON.stringify(errData));
      }

      // 🔥 Quan trọng: refetch lại list
      await fetchGroups();

      setNewGroupName("");
      setShowCreateModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <p>Đang tải...</p>;
  if (error) return <p>Lỗi: {error}</p>;

  return (
    <div className={styles.Page}>
      <div className={styles.navbar}>
        <input
          type="text"
          placeholder="Lọc nhóm chi tiết..."
          className={styles.searchBar}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>+ Tạo nhóm</button>

        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${
              activeTab === "all" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("all")}
          >
            Tất cả
          </button>

          <button
            className={`${styles.filterBtn} ${
              activeTab === "managing" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("managing")}
          >
            Đang quản lý
          </button>

          <button
            className={`${styles.filterBtn} ${
              activeTab === "participating" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("participating")}
          >
            Đang tham gia
          </button>
        </div>
      </div>

      <div className={styles.group_container}>
        {filteredGroups.map((group) => (
          <Group
            key={group.uuid}
            uuid={group.uuid}
            leader={group.leader}
            leaderAvatar={group.leaderAvatar}
            title={group.title}
            filesCount={group.filesCount}
            membersCount={group.membersCount}
            avatarUrl={group.avatarUrl}
            color={group.color}
            onAddMember={handleOpenAddMember}
            onLeaveGroup={handleLeaveGroup} 
            onDeleteGroup={handleDeleteGroup}
            
          />
        ))}
      </div>
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Tạo nhóm mới</h3>

            <input
            className={styles.input}
              type="text"
              placeholder="Nhập tên nhóm..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />

            <div className={styles.modalActions}>
              <button
                className={styles.primary}
                onClick={handleCreateGroup}
                disabled={creating}
              >
                {creating ? "Đang tạo..." : "Tạo nhóm"}
              </button>

              <button
                className={styles.secondary}
                onClick={() => setShowCreateModal(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
      {showAddModal && (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3>Thêm thành viên</h3>
        <input
          placeholder="Tên người dùng"
          value={newMember}
          onChange={(e) => setNewMember(e.target.value)}
        />
        <div className={styles.modalActions}>
          <button
          // onClick={() => handleAddMember(selectedGroupUuid)}
          className={styles.primary}
          onClick={async () => {
            try {
                        const token = localStorage.getItem("access");
                        const res = await apiFetch(
                          `/groups/${selectedGroupUuid}/add_member/`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ username: newMember }),
                          }
                        );
                        if (!res.ok) throw new Error("Thêm thành viên thất bại");
                        alert("Thêm thành viên thành công!");
                        setShowAddModal(false);
                        setNewMember("");
                        await fetchGroups();
                      } catch (err) {
                        console.error(err);
                        alert("Có lỗi xảy ra!");
                      }
                    }}
                    >
            Thêm
          </button>
          <button className={styles.secondary} onClick={() => setShowAddModal(false)}>
            Hủy
          </button>
        </div>
      </div>
    </div>
  )}
    </div>
    
  );
};

export default GroupPage;