import { useState, useMemo, useEffect } from "react";
import styles from "./Projects.module.css";
import ProjectCard from "../components/ProjectCard";
import { FaSearch } from "react-icons/fa";
import { apiFetch } from "../utils/api";

import { FaPlus } from "react-icons/fa6";

const STATUS = ["preparing", "ongoing", "finished"];

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [scopeFilter, setScopeFilter] = useState("all");

  // const username = localStorage.getItem("username");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groups, setGroups] = useState([]);
  const [formData, setFormData] = useState({
    group_uuid: "",
    name: "",
    start_date: "",
    end_date: "",
  });



  //editing modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const [editForm, setEditForm] = useState({
    name: "",
    start_date: "",
    end_date: ""
  });

  // const deleteProject = async (projectId) => {
  //   const access = localStorage.getItem("access");

  //   const res = await apiFetch(`/projects/${projectId}/delete/`, {
  //     method: "DELETE",
  //     headers: {
  //       Authorization: `Bearer ${access}`,
  //     },
  //   });

  //   const data = await res.json();
  //   if (!res.ok) throw new Error(data.error || "Delete failed");
  //   return data;
  // };

  const deleteMultipleProjects = async (projectIds) => {
    const confirmLeave = window.confirm("Bạn có chắc muốn xóa dự án(các dự án) không?");
    if (!confirmLeave) return;
    const access = localStorage.getItem("access");

    const res = await apiFetch(`/projects/delete/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({ project_uuids: projectIds }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Delete failed");
    alert(data.message || "Đã xóa dự án(các dự án) thành công!");
    fetchProjects();

    return data;
  };

  const handleOpenEdit = (projectId) => {
  const project = projects.find(p => p.project_id === projectId);
    if (!project) return;

    setEditingProject(project);

    setEditForm({
      name: project.project_name,
      start_date: "",
      end_date: ""
    });

    setShowEditModal(true);
  };

  const determineStatus = (start, end) => {
  const now = new Date();
  const s = new Date(start);
  const e = new Date(end);

  if (now < s) return "preparing";
  if (now >= s && now <= e) return "ongoing";
    return "finished";
  };

  //Hàm update dự án
    const handleUpdateProject = async () => {
      try {
        const access = localStorage.getItem("access");

        const payload = {
          name: editForm.name
        };

        if (editForm.start_date) {
          const start = new Date(editForm.start_date);
          payload.start_date = start.toISOString().replace("T", " ").slice(0, 19);
        }

        if (editForm.end_date) {
          const end = new Date(editForm.end_date);
          payload.end_date = end.toISOString().replace("T", " ").slice(0, 19);
        }
        console.log(editingProject.project_id);
        const res = await apiFetch(
          `/projects/${editingProject.project_id}/update/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${access}`,
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await res.json();
        console.log("SERVER RESPONSE:", data);

        if (!res.ok) throw new Error("Update thất bại");
        

        setShowEditModal(false);
        window.location.reload();

      } catch (err) {
        console.error(err);
      }
    };

  //Hàm tạo dự án
  const handleCreateProject = async () => {
    if (!formData.group_uuid || !formData.name) {
      alert("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      alert("Vui lòng chọn ngày giờ");
      return;
    }

    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);

    const status = determineStatus(start, end);

    const payload = {
      name: formData.name,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      status: status,
    };

    try {
      const access = localStorage.getItem("access");

      const res = await apiFetch(
        `/projects/${formData.group_uuid}/create/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json(); // 🔥 QUAN TRỌNG

      if (!res.ok) {
        // 👇 lấy lỗi từ DRF
        const message = data.error || "Tạo dự án thất bại";
        alert(message);
        return;
      }

      alert("Tạo dự án thành công");

      setShowCreateModal(false);
      fetchProjects();

    } catch (err) {
      alert("Lỗi server");
    }
  };
  const fetchProjects = async () => {
    try {
      const access = localStorage.getItem("access");

      const res = await apiFetch("/projects/my-projects/", {
        headers: {
          Authorization: `Bearer ${access}`,
        },
      });

      const data = await res.json();

      const normalized = data.map((p) => ({
        project_id: p.uuid,
        createdby: p.leader.username,
        project_name: p.name,
        startdate: new Date(p.start_date).toLocaleDateString(),
        enddate: new Date(p.end_date).toLocaleDateString(),
        status: p.status,
        progress: p.progress,
        color: p.color, // có thể random sau
        members: p.members.map((m) => ({
          user_id: m.user_id,
          avatarPath:m.avatarpath,
        })),
        is_creator: p.is_creator,
      }));

      setProjects(normalized);
      console.log(normalized)
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    fetchProjects();
    const interval = setInterval(fetchProjects, 60000);
    return () => clearInterval(interval);
  }, []);

  const normalizePath = (path) => {
    if (!path) return null;
    return `http://127.0.0.1:8000${path.replace(/\\/g, "/")}`;
  };


  const filterByScope = (project) => {
    switch (scopeFilter) {
      case "managed":
        return project.is_creator;

      case "joined":
        return !project.is_creator;

      default:
        return true;
    }
  };

  const toggleSelect = (projectId) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const projectsByStatus = useMemo(() => {
    return STATUS.reduce((acc, status) => {
      acc[status] = projects.filter(
        (p) => p.status === status && filterByScope(p)
      );
      return acc;
    }, {});
  }, [projects, scopeFilter]);

  return (
    <div className={styles.Page}>
      {/* TOOLBAR */}
      <div className={styles.toolbar}>
          <div className={styles.searchBar}>
            <FaSearch className={styles.SearchIcon} />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className={styles.SearchInput}
            />
          </div>


        <div className={styles.toolbox}>
          {selectedProjectIds.length > 0 && (
            <div className={styles.box}>
              <button
                className={styles.cancelBtn}
                onClick={() => setSelectedProjectIds([])}
              >
                Hủy
              </button>

              <button
                className={styles.deleteBtn}
                onClick={async () => {
                  try {
                    const data = await deleteMultipleProjects(selectedProjectIds);
                    setSelectedProjectIds([]);
                  } catch (err) {
                    alert(err.message);
                  }
                }}
              >
                Xóa ({selectedProjectIds.length})
              </button>

            </div>
          )}
          {/* Tạo dự án */}
          <button className={styles.createBtn}
            onClick={async () => {
              setShowCreateModal(true);

              const access = localStorage.getItem("access");

              const res = await apiFetch(
                "/groups/my-groups/",
                {
                  headers: {
                    Authorization: `Bearer ${access}`,
                  },
                }
              );

              const data = await res.json();

              const user = JSON.parse(localStorage.getItem("user"));
              const username = user?.username;

              const filteredGroups = data.filter(
                (g) => g.leader?.username === username
              );

              setGroups(filteredGroups);
            }}
          >
            + Tạo dự án
          </button>
          <button
            className={scopeFilter === "all" ? styles.active : ""}
            onClick={() => setScopeFilter("all")}
          >
            Tất cả
          </button>

          <button
            className={scopeFilter === "managed" ? styles.active : ""}
            onClick={() => setScopeFilter("managed")}
          >
            Đang quản lý
          </button>

          <button
            className={scopeFilter === "joined" ? styles.active : ""}
            onClick={() => setScopeFilter("joined")}
          >
            Đang tham gia
          </button>
        </div>
      </div>

      {/* COLUMNS */}
      <div className={styles.columns}>
        {STATUS.map((status) => (
          <div key={status} className={styles.column}>
            <h3 className={styles.columnTitle}>
              {status === "preparing"
                ? "CHUẨN BỊ"
                : status === "ongoing"
                ? "ĐANG DIỄN RA"
                : "ĐÃ KẾT THÚC"}
            </h3>

            {projectsByStatus[status]?.map((p) => (
              <ProjectCard
                key={p.project_id}
                projectId={p.project_id}
                projectName={p.project_name}
                startDate={p.startdate}
                endDate={p.enddate}
                progress={p.progress}
                isSelected={selectedProjectIds.includes(p.project_id)}
                onToggleSelect={() => toggleSelect(p.project_id)}
                commentCount={3}
                isRead={true}
                members={p.members}
                color={p.color}
                onEdit={handleOpenEdit}
              />
            ))}
          </div>
        ))}
      </div>
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Tạo dự án mới</h2>

            {/* CHỌN GROUP */}
            <select
              value={formData.group_uuid}
              onChange={(e) =>
                setFormData({ ...formData, group_uuid: e.target.value })
              }
            >
              <option value="">-- Chọn nhóm --</option>
              {groups.map((g) => (
                <option key={g.uuid} value={g.uuid}>
                  {g.group_name}
                </option>
              ))}
            </select>

            {/* TÊN PROJECT */}
            <input
              type="text"
              placeholder="Tên dự án"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />

            {/* START DATE */}
            <label>Ngày bắt đầu</label>
            <input
              type="datetime-local"
              value={formData.start_date}
              onChange={(e) =>
                setFormData({ ...formData, start_date: e.target.value })
              }
            />

            {/* END DATE */}
            <label>Ngày kết thúc</label>
            <input
              type="datetime-local"
              value={formData.end_date}
              onChange={(e) =>
                setFormData({ ...formData, end_date: e.target.value })
              }
            />

            <div className={styles.modalActions}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setError("");
                }}
              >
                Hủy
              </button>

              <button onClick={handleCreateProject}>
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}
      {showEditModal && editingProject && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Chỉnh sửa dự án</h2>

            <input
              type="text"
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
            />

            <label>Ngày bắt đầu</label>
            <input
              type="datetime-local"
              value={editForm.start_date}
              onChange={(e) =>
                setEditForm({ ...editForm, start_date: e.target.value })
              }
            />

            <label>Ngày kết thúc</label>
            <input
              type="datetime-local"
              value={editForm.end_date}
              onChange={(e) =>
                setEditForm({ ...editForm, end_date: e.target.value })
              }
            />

            <div className={styles.modalActions}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProject(null);
                }}
              >
                Hủy
              </button>

              <button onClick={handleUpdateProject}>
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;