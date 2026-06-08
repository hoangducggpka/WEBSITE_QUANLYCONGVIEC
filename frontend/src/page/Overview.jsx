// Overview.jsx — activity fetch từ /projects/activity/ riêng
import styles from "./Overview.module.css";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

import { TbFolderCheck, TbFolderBolt, TbFolderPlus } from "react-icons/tb";
import { TfiLayoutGrid3Alt } from "react-icons/tfi";
import { FaArrowTrendUp, FaChevronRight } from "react-icons/fa6";

import { apiFetch } from "../utils/api";
import { useNavigate } from "react-router-dom";

function Overview() {

  const [overviewData, setOverviewData]   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [activityFilter, setActivityFilter] = useState("all");
  const [activities, setActivities]       = useState([]);
  const navigate = useNavigate()

  // =====================================================
  // FETCH OVERVIEW (stats + projects + tasks)
  // =====================================================
  useEffect(() => {

    const fetchOverview = async () => {
      try {
        const res = await apiFetch("/projects/overview/");
        if (!res.ok) throw new Error("Failed to fetch overview");

        const data = await res.json();
        setOverviewData(data);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  // =====================================================
  // FETCH ACTIVITY — endpoint riêng
  // =====================================================
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await apiFetch("/tasks/activity/?limit=20"); 
        if (!res.ok) throw new Error("Failed to fetch activities");
        const data = await res.json();
        setActivities(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchActivities();
  }, []);
  


  // =====================================================
  // WEBSOCKET — realtime push
  // =====================================================
  useEffect(() => {
    const token  = localStorage.getItem("access");
    const socket = new WebSocket(
      `ws://127.0.0.1:8000/ws/tasks/activity/?token=${token}`
    );

    socket.onopen = () => {
      console.log("Task activity socket connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("ACTIVITY WS:", data);

      setActivities((prev) => {
        // Tránh duplicate nếu đã có từ REST fetch
        if (prev.some((a) => a.id === data.id)) return prev;
        return [data, ...prev].slice(0, 20);
      });
    };

    socket.onclose = () => {
      console.log("Task activity socket disconnected");
    };

    socket.onerror = (e) => {
      console.error("Task activity socket error", e);
    };

    return () => socket.close();

  }, []);

  // =====================================================
  // DELETE activity (UI only + gọi API)
  // =====================================================
  const handleDeleteActivity = async (id) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    try {
      await apiFetch(`/tasks/activity/${id}/delete/`, { method: "DELETE" }); // ← /tasks/ thay vì /projects/
    } catch (err) {
      console.error("Delete activity error:", err);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================
  if (loading) {
    return <div className={styles.page}>Loading...</div>;
  }

  // =====================================================
  // DATA
  // =====================================================
  const stats = [
    {
      title: "Tổng dự án",
      value: overviewData?.total_projects || 0,
      desc:  "Đang quản lý",
      icon:  <TfiLayoutGrid3Alt />,
    },
    {
      title: "Tổng công việc",
      value: overviewData?.total_tasks || 0,
      desc:  "Tasks đã tạo",
      icon:  <TbFolderPlus />,
    },
    {
      title: "Đang thực hiện",
      value: overviewData?.total_inprogress_tasks || 0,
      desc:  "Tasks active",
      icon:  <TbFolderBolt />,
    },
    {
      title: "Hoàn thành",
      value: overviewData?.total_done_tasks || 0,
      desc:  "Tasks completed",
      icon:  <TbFolderCheck />,
    },
  ];

  const projects = overviewData?.ending_projects || [];
  const tasks    = overviewData?.ending_tasks    || [];

  // =====================================================
  // HELPERS
  // =====================================================
  const filteredActivities = activities.filter((item) => {

    if (activityFilter === "all") return true;

    const created  = new Date(item.created_at);
    const now      = new Date();
    const diffDays = (now - created) / (1000 * 60 * 60 * 24);

    if (activityFilter === "today") return diffDays <= 1;
    if (activityFilter === "week")  return diffDays <= 7;

    return true;
  });

  const getRemainingText = (endDate) => {
    if (!endDate) return "Unknown";

    const now  = new Date();
    const end  = new Date(endDate);
    const diff = end - now;

    if (diff <= 0) return "Quá hạn";

    const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    return days >= 1 ? `${days} ngày còn lại` : `${hours} giờ còn lại`;
  };

  const getRiskLabel = (progress) => {
    if (progress < 30) return "Critical";
    if (progress < 60) return "High";
    if (progress < 85) return "Medium";
    return "Low";
  };

  const getRiskClass = (progress) => {
    if (progress < 30) return styles.risk_critical;
    if (progress < 60) return styles.risk_high;
    if (progress < 85) return styles.risk_medium;
    return styles.risk_low;
  };

  const getActivityClass = (action) => {
    if (!action) return "";
    const a = action.toLowerCase();
    if (a.includes("complet")) return styles.activity_card_completed;
    if (a.includes("approv"))  return styles.activity_card_approved;
    if (a.includes("reopen"))  return styles.activity_card_reopened;
    if (a.includes("overdue")) return styles.activity_card_overdue;
    if (a.includes("assign"))  return styles.activity_card_assigned;
    return "";
  };

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className={styles.page}>

      {/* ===== LEFT ===== */}
      <div className={styles.left_container}>

        {/* STATS */}
        <div className={styles.stats_grid}>
          {stats.map((item, index) => (
            <motion.div
              key={index}
              className={styles.stat_card}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <div className={styles.stat_top}>
                <div className={styles.stat_icon}>{item.icon}</div>
                <div className={styles.stat_trend}><FaArrowTrendUp /></div>
              </div>
              <div className={styles.stat_content}>
                <h4>{item.title}</h4>
                <h1>{item.value}</h1>
                <p>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* PROJECTS */}
        <div className={styles.projects_section}>
          <div className={styles.section_header}>
            <div>
              <h3>Dự án gần hết hạn</h3>
              <p>Workspace monitoring</p>
            </div>
          </div>

          <div className={styles.projects_list}>
            {projects.map((item, index) => (
              <motion.div
                key={item.uuid}
                className={styles.project_card}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.2 }}
              >
                <div className={styles.project_top}>
                  <div>
                    <h4>{item.name}</h4>
                    <p>{item.computed_status}</p>
                  </div>
                  <button className={styles.project_button}>
                    <FaChevronRight />
                  </button>
                </div>

                <div className={styles.project_progress_container}>
                  <div
                    className={styles.project_progress}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>

                <div className={styles.project_stats}>
                  <span>Progress</span>
                  <span>{item.progress}%</span>
                </div>

                <div className={styles.project_footer}>
                  <span>{getRemainingText(item.end_date)}</span>
                  <div className={`${styles.risk} ${getRiskClass(item.progress)}`}>
                    {getRiskLabel(item.progress)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>

      {/* ===== RIGHT ===== */}
      <div className={styles.right_container}>

        {/* TASKS */}
        <div className={styles.tasks_section}>
          <div className={styles.section_header}>
            <div>
              <h3>Các tasks ưu tiên</h3>
              <p>Current focus</p>
            </div>
          </div>

          <div className={styles.tasks_list}>
            {tasks.map((item, index) => (
              <motion.div
                key={item.uuid}
                className={styles.task_card}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.2 }}
              >
                <div
                  className={styles.progress_circle}
                  style={{
                    background: `conic-gradient(
                      #22c55e ${item.progress * 3.6}deg,
                      #e5e7eb 0deg
                    )`,
                  }}
                >
                  <div className={styles.progress_inner}>
                    {item.progress}%
                  </div>
                </div>

                <div className={styles.task_content}>
                  <div className={styles.task_header}>
                    <h4>{item.name}</h4>
                    <div className={styles.priority}>{item.priority}</div>
                  </div>
                  <p>{item.project}</p>
                  <div className={styles.task_footer}>
                    <span>{getRemainingText(item.end_date)}</span>
                    <FaChevronRight />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ACTIVITY */}
        <div className={styles.activity_section}>
          <div className={styles.section_header}>
            <div>
              <h3>Các hoạt động tasks</h3>
              <p>Realtime workspace updates</p>
            </div>

            <div className={styles.activity_filters}>
              {["all", "today", "week"].map((f) => (
                <button
                  key={f}
                  className={activityFilter === f ? styles.filter_active : ""}
                  onClick={() => setActivityFilter(f)}
                >
                  {f === "all" ? "All" : f === "today" ? "Today" : "This Week"}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.activity_list}>
            {filteredActivities.map((item, index) => (
              <motion.div
                key={item.id}
                className={`${styles.activity_card} ${getActivityClass(item.action)}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={(uuid) => {
                    navigate(`/project-detail/${item.project?.uuid}`);
                }}
              >
                <div className={styles.activity_dot} />

                <div className={styles.activity_content}>
                  <h4>{item.user?.username}</h4>
                  <p>
                    <strong>{item.action}</strong>
                    {" "}của công việc{" "}
                    {item.task?.name}
                  </p>
                  <span>{item.project?.name}</span>
                </div>

                <button
                  className={styles.delete_activity}
                  onClick={() => handleDeleteActivity(item.id)}
                >
                  ×
                </button>
              </motion.div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

export default Overview;
