import { useMemo, useState, useEffect } from "react";
import TaskCardTaskPage from "../components/TaskCardTaskPage";
import styles from "./TaskPage.module.css";
import { apiFetch } from "../utils/api";

export default function TaskPage() {
  const [tasks, setTasks] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const [keyword, setKeyword] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ================= FETCH API ================= */

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);

        let accessToken = localStorage.getItem("access");

        const request = async (token) => {
          return apiFetch("/tasks/my-tasks/", {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        };

        let res = await request(accessToken);

        if (res.status === 401) {
          const refreshToken = localStorage.getItem("refresh");

          const refreshRes = await apiFetch("/api/token/refresh/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (!refreshRes.ok) {
            throw new Error("Phiên đăng nhập hết hạn");
          }

          const refreshData = await refreshRes.json();
          accessToken = refreshData.access;

          localStorage.setItem("access", accessToken);

          res = await request(accessToken);
        }

        if (!res.ok) throw new Error("Không thể lấy task");

        const data = await res.json();

        const mappedTasks = data.tasks.map((task) => ({
          id: task.uuid,
          title: task.name,
          project: task.project_name,
          group: task.group_name,
          status: task.status,
          startDate: new Date(task.start_date).getTime(),
          endDate: new Date(task.end_date).getTime(),
          createdAt: new Date(task.created_at).getTime(),
        }));

        setTasks(mappedTasks);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
    const interval = setInterval(fetchTasks, 60000);
    return () => clearInterval(interval);
  }, []);

  const getErrorMessage = (data) => {
    if (!data) return "Có lỗi xảy ra";
    if (data.error) return data.error;
    if (data.non_field_errors) return data.non_field_errors[0];
    if (data.detail) return data.detail;

    const firstKey = Object.keys(data)[0];
    if (firstKey && Array.isArray(data[firstKey])) {
      return data[firstKey][0];
    }

    return "Có lỗi xảy ra";
  };

    //Hàm update status
  const handleStatusChange = async (taskId, newStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let message = "Bạn có chắc muốn thay đổi trạng thái task?";

    if (newStatus === "done") {
      message =
        "Bạn đang đánh dấu task là HOÀN THÀNH.\n\n" +
        "⚠️ Bạn sẽ không thể thay đổi trạng thái sau khi hoàn thành.\n" +
        "Hãy kiểm tra kỹ trước khi xác nhận.\n\n" +
        "Bạn có chắc chắn?";
    }


    const confirmed = window.confirm(message);
      if (!confirmed) return;

      try {
        let accessToken = localStorage.getItem("access");

        const request = async (token) => {
          return apiFetch(`/tasks/${taskId}/update-status/`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              status: newStatus,
              confirm: true,
            }),
          });
        };

        let res = await request(accessToken);

        // handle refresh token
        if (res.status === 401) {
          const refreshToken = localStorage.getItem("refresh");

          const refreshRes = await apiFetch("/api/token/refresh/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (!refreshRes.ok) throw new Error("Phiên đăng nhập hết hạn");

          const refreshData = await refreshRes.json();
          accessToken = refreshData.access;

          localStorage.setItem("access", accessToken);

          res = await request(accessToken);
        }

        const data = await res.json();

        if (!res.ok) {
          alert(getErrorMessage(data));
          return;
        }

        if (data.message === "No change") {
          return;
        }

        // ✅ SUCCESS → update UI
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: newStatus } : t
          )
        );
      } catch (err) {
        alert(err.message);
      }
  };
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedIds([]);

  /* ================= DELETE UI ================= */

  const deleteSelected = () => {
    setTasks((prev) => prev.filter((t) => !selectedIds.includes(t.id)));
    clearSelection();
  };

  /* ================= FILTER + SEARCH + SORT ================= */

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (keyword.trim()) {
      const lower = keyword.toLowerCase();

      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(lower) ||
          t.project.toLowerCase().includes(lower) ||
          t.group.toLowerCase().includes(lower)
      );
    }

    if (filterStatus !== "all") {
      result = result.filter((t) => {
        if (filterStatus === "overdue") {
          return t.endDate < Date.now() && t.status !== "done";
        }
        return t.status === filterStatus;
      });
    }

    result.sort((a, b) =>
      sortOrder === "asc"
        ? a.createdAt - b.createdAt
        : b.createdAt - a.createdAt
    );

    return result;
  }, [tasks, keyword, filterStatus, sortOrder]);

  /* ================= RENDER ================= */

  if (loading) return <div className={styles.page}>Loading tasks...</div>;

  if (error) return <div className={styles.page}>Error: {error}</div>;

  return (
    <div className={styles.page}>
      {/* Toolbar */}

      <div className={styles.toolbar}>
        <input
          placeholder="Tìm công việc..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        <select onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">Tất cả</option>
          <option value="todo">Phải làm</option>
          <option value="inprogress">Đang làm</option>
          <option value="done">Đã xong</option>

          <option value="stuck">Gặp trục trặc</option>
          <option value="overdue">Quá hạn</option>
        </select>

        <select onChange={(e) => setSortOrder(e.target.value)}>
          <option value="desc">Mới nhất</option>
          <option value="asc">Cũ nhất</option>
        </select>

        {selectedIds.length > 0 && (
          <div className={styles.actions}>
            <button
              className={styles.deleteBtn}
              onClick={deleteSelected}
            >
              Delete ({selectedIds.length})
            </button>

            <button
              className={styles.clearBtn}
              onClick={clearSelection}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* TASK LIST */}

      {filteredTasks.length === 0 ? (
        <div className={styles.empty}>
          Không có task nào phù hợp
        </div>
      ) : (
        <div className={styles.list}>
          {filteredTasks.map((task) => {
            const checked = selectedIds.includes(task.id);

            return (
              <div
                key={task.id}
                className={`${styles.cardWrapper} ${
                  checked ? styles.checked : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSelect(task.id)}
                  className={styles.checkbox}
                />

                <TaskCardTaskPage 
                  task={task}
                  onStatusChange={handleStatusChange} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

