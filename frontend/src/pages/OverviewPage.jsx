import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TaskCardTaskPage from "../components/TaskCardTaskPage";
import styles from "./OverviewPageV2.module.css";
import { apiFetch } from "../utils/api";

const BASE_URL = "http://127.0.0.1:8000";

export default function OverviewPageV2() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("all");

  const taskFetch = () => {
    apiFetch(`/tasks/warning-tasks/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setTasks(data.tasks || []))
      .catch((err) => console.error(err));
  }

  // ===== FETCH =====
  useEffect(() => {
    taskFetch();
    const interval = setInterval(taskFetch, 60000);
    return () => clearInterval(interval);
  }, []);

  // ===== NORMALIZE =====
  const normalizeTask = (t) => ({
    id: t.uuid,
    title: t.task_name,
    project: t.project_name,
    project_uuid: t.project_uuid,
    status: t.status,
    assignee: t.assigned_to?.fullname || "Unknown",
    user_code: t.assigned_to?.user_code || "N/A",
    avatar: t.assigned_to?.avatarpath,
    startDate: new Date(t.start_date).getTime(),
    endDate: new Date(t.end_date).getTime(),
    note: t.warning_note,
    type: t.type,
  });

  const normalizedTasks = useMemo(
    () => tasks.map(normalizeTask),
    [tasks]
  );

  // ===== SPLIT ROLE =====
  const personalTasks = normalizedTasks.filter(
    (t) => t.type === "personal"
  );

  const leaderTasks = normalizedTasks.filter(
    (t) => t.type === "leader"
  );

  // ===== KPI =====
  // const total = normalizedTasks.length;
  // const done = normalizedTasks.filter((t) => t.status === "done").length;
  // const stuck = normalizedTasks.filter((t) => t.status === "stuck").length;
  // const overdue = normalizedTasks.filter(
  //   (t) => t.endDate < Date.now() && t.status !== "done"
  // ).length;

  // const progress = total ? Math.round((done / total) * 100) : 0;

  // ===== FILTER LEADER =====
  const getSeverity = (note) => {
    if (!note) return "warning";
    if (note.includes("20%")) return "warning";
    if (note.includes("50%")) return "announce";
    // return "review";
  };


  const filteredLeader = leaderTasks.filter((t) => {
    const severity = getSeverity(t.note);
    if (filter === "warning") return severity === "warning";
    if (filter === "announce") return severity === "announce";
    // if (filter === "review") return severity === "review";
    return true;
  });

  // ===== UTIL =====
  const truncate = (text, max = 30) =>
    text?.length > max ? text.slice(0, max) + "..." : text;

  const handleStatusChange = async (taskId, newStatus) => {
    const task = tasks.find((t) => t.uuid === taskId);
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

        // ❌ API trả lỗi confirm
        if (!res.ok) {
          alert(data?.non_field_errors?.[0] || "Có lỗi xảy ra");
          return;
        }

        // ❗ Không thay đổi
        if (data.message === "No change") {
          return;
        }

        // ✅ SUCCESS → update UI
        setTasks((prev) =>
          prev.map((t) =>
            t.uuid === taskId ? { ...t, status: newStatus } : t
          )
        );
        taskFetch()
      } catch (err) {
        alert(err.message);
      }
  };

  // ===== RENDER =====
  return (
    <div className={styles.page}>
      {/* KPI */}
      {/* <div className={styles.kpiRow}>
        <div className={`${styles.kpiCard} ${styles.kpiDanger}`}>
          🔥 {overdue} trễ hạn
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiWarning}`}>
          ⚠️ {stuck} bị kẹt
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiSuccess}`}>
          📊 {progress}% tiến độ
        </div>
        <div className={styles.kpiCard}>
          📋 {total} tasks
        </div>
      </div> */}

      {/* MAIN */}
      <div className={styles.mainGrid}>
        {/* PERSONAL */}
        <div className={`${styles.section} ${styles.memberZone}`}>
          <h2>🚨 Việc cần chú ý</h2>

          <div className={styles.list}>
            {personalTasks.map((task) => (
              <TaskCardTaskPage
                key={task.id}
                task={{
                  ...task,
                  project: truncate(task.project),
                  avatar:
                    task.avatar || "/default-avatar.png",
                }}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>

        {/* LEADER */}
        <div className={`${styles.section} ${styles.leaderZone}`}>
          <h2>🧠 Giám sát dự án của tôi</h2>

          <div className={styles.filterRow}>
            {["all", "warning", "announce"].map((f) => (
              <button
                key={f}
                className={`${styles.filterBtn} ${
                  filter === f ? styles.activeFilter : ""
                }`}
                onClick={() => setFilter(f)}
              >
                {f === "all"
                  ? "Tất cả"
                  : f === "warning"
                  ? "Cảnh báo"
                  : f === "announce"
                  ? "Nhắc nhở"
                  : null}
              </button>
            ))}
          </div>


          <div className={styles.list}>
            {filteredLeader.map((task) => {
              const severity = getSeverity(task.note);

              return (
                <div
                  key={task.id}
                  className={`${styles.monitorCard} ${
                    styles["monitor" +
                      severity.charAt(0).toUpperCase() +
                      severity.slice(1)]
                  }`}
                  onClick={() =>
                    navigate(`/projects/${task.project_uuid}/`)
                  }
                >
                  <div className={styles.monitorTitle}>
                    {task.title}
                  </div>

                  <div className={styles.monitorMeta}>
                    {truncate(task.project)} • {task.note}
                  </div>

                  <div className={styles.monitorUser}>
                    👤 {task.assignee} ({task.user_code})
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

