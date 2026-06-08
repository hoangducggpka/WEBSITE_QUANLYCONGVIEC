import styles from "./Overview.module.css";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

import {
  TbFolderCheck,
  TbFolderBolt,
  TbFolderPlus,
} from "react-icons/tb";

import {
  TfiLayoutGrid3Alt,
} from "react-icons/tfi";

import {
  FaArrowTrendUp,
  FaChevronRight,
  FaPaperPlane,
} from "react-icons/fa6";

import {
  FiPaperclip,
} from "react-icons/fi";

import { apiFetch } from "../utils/api";


function Overview() {

  const [message, setMessage] = useState("");

  const [overviewData, setOverviewData] = useState(null);

  const [loading, setLoading] = useState(true);

  // =====================================================
  // FETCH OVERVIEW
  // =====================================================
  const [activities, setActivities] = useState([]);
  useEffect(() => {

    const fetchOverview = async () => {

      try {

        const res = await apiFetch(
          "/projects/overview/"
        );

        if (!res.ok) {
          throw new Error("Failed to fetch overview");
        }

        const data = await res.json();

        console.log(data);

        setOverviewData(data);

      } catch (err) {

        console.error(err);

      } finally {

        setLoading(false);
      }
    };

    fetchOverview();

  }, []);
  useEffect(() => {
    const token = localStorage.getItem("access")
    const socket = new WebSocket(
      `ws://127.0.0.1:8000/ws/tasks/activity/?token=${token}`
    );

    socket.onmessage = (event) => {

      const data = JSON.parse(event.data);

      console.log("ACTIVITY:", data);

      setActivities((prev) => [
        data,
        ...prev.slice(0, 14)
      ]);
    };

    socket.onclose = () => {
      console.log("Task activity socket disconnected");
    };

    return () => {
      socket.close();
    };

  }, []);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className={styles.page}>
        Loading...
      </div>
    );
  }

  // =====================================================
  // DATA
  // =====================================================

  const stats = [
    {
      title: "Tổng dự án",
      value: overviewData?.total_projects || 0,
      desc: "Đang quản lý",
      icon: <TfiLayoutGrid3Alt />,
    },
    {
      title: "Tổng công việc",
      value: overviewData?.total_tasks || 0,
      desc: "Tasks đã tạo",
      icon: <TbFolderPlus />,
    },
    {
      title: "Đang thực hiện",
      value: overviewData?.total_inprogress_tasks || 0,
      desc: "Tasks active",
      icon: <TbFolderBolt />,
    },
    {
      title: "Hoàn thành",
      value: overviewData?.total_done_tasks || 0,
      desc: "Tasks completed",
      icon: <TbFolderCheck />,
    },
  ];

  const projects = overviewData?.ending_projects || [];

  const tasks = overviewData?.ending_tasks || [];

  // =====================================================
  // HELPERS
  // =====================================================

  const getRemainingText = (endDate) => {

    if (!endDate) return "Unknown";

    const now = new Date();

    const end = new Date(endDate);

    const diff = end - now;

    const hours = Math.floor(
      diff / (1000 * 60 * 60)
    );

    const days = Math.floor(
      diff / (1000 * 60 * 60 * 24)
    );

    if (diff <= 0) {
      return "Quá hạn";
    }

    if (days >= 1) {
      return `${days} ngày còn lại`;
    }

    return `${hours} giờ còn lại`;
  };

  const getRiskLabel = (progress) => {

    if (progress < 30) {
      return "Critical";
    }

    if (progress < 60) {
      return "High";
    }

    if (progress < 85) {
      return "Medium";
    }

    return "Low";
  };

  return (

    <div className={styles.page}>

      <div className={styles.left_container}>

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

                <div className={styles.stat_icon}>
                  {item.icon}
                </div>

                <div className={styles.stat_trend}>
                  <FaArrowTrendUp />
                </div>

              </div>

              <div className={styles.stat_content}>
                <h4>{item.title}</h4>
                <h1>{item.value}</h1>
                <p>{item.desc}</p>
              </div>

            </motion.div>
          ))}

        </div>

        <div className={styles.projects_section}>

          <div className={styles.section_header}>

            <div>
              <h3>Dự án gần hết hạn</h3>
              <p>Workspace monitoring</p>
            </div>

            <button>
              Tất cả
            </button>

          </div>

          <div className={styles.projects_list}>

            {projects.map((item, index) => (

              <motion.div
                key={item.uuid}
                className={styles.project_card}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.08,
                  duration: 0.2
                }}
              >

                <div className={styles.project_top}>

                  <div>
                    <h4>{item.name}</h4>

                    <p>
                      {item.computed_status}
                    </p>
                  </div>

                  <button className={styles.project_button}>
                    <FaChevronRight />
                  </button>

                </div>

                <div className={styles.project_progress_container}>

                  <div
                    className={styles.project_progress}
                    style={{
                      width: `${item.progress}%`,
                    }}
                  />

                </div>

                <div className={styles.project_stats}>

                  <span>
                    Progress
                  </span>

                  <span>
                    {item.progress}%
                  </span>

                </div>

                <div className={styles.project_footer}>

                  <span>
                    {getRemainingText(item.end_date)}
                  </span>

                  <div className={styles.risk}>
                    {getRiskLabel(item.progress)}
                  </div>

                </div>

              </motion.div>
            ))}

          </div>

        </div>

      </div>

      <div className={styles.right_container}>

        <div className={styles.tasks_section}>

          <div className={styles.section_header}>

            <div>
              <h3>Priority Tasks</h3>
              <p>Current focus</p>
            </div>

            <button>
              Tất cả
            </button>

          </div>

          <div className={styles.tasks_list}>

            {tasks.map((item, index) => (

              <motion.div
                key={item.uuid}
                className={styles.task_card}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.08,
                  duration: 0.2
                }}
              >

                <div
                  className={styles.progress_circle}
                  style={{
                    background: `conic-gradient(
                      #22c55e ${item.progress * 3.6}deg,
                      #e5e7eb 0deg
                    )`
                  }}
                >

                  <div className={styles.progress_inner}>
                    {item.progress}%
                  </div>

                </div>

                <div className={styles.task_content}>

                  <div className={styles.task_header}>

                    <h4>{item.name}</h4>

                    <div className={styles.priority}>
                      {item.priority}
                    </div>

                  </div>

                  <p>
                    {item.project}
                  </p>

                  <div className={styles.task_footer}>

                    <span>
                      {getRemainingText(item.end_date)}
                    </span>

                    <FaChevronRight />

                  </div>

                </div>

              </motion.div>
            ))}

          </div>

        </div>

        <div className={styles.activity_section}>

          <div className={styles.section_header}>

            <div>
              <h3>Recent Activities</h3>
              <p>Realtime workspace updates</p>
            </div>

          </div>

          <div className={styles.activity_list}>

            {activities.map((item, index) => (

              <motion.div
                key={index}
                className={styles.activity_card}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: index * 0.03
                }}
              >

                <div className={styles.activity_dot} />

                <div className={styles.activity_content}>

                  <h4>
                    {item.user.username}
                  </h4>

                  <p>

                    <strong>
                      {item.action}
                    </strong>

                    {" "}on{" "}

                    {item.task.name}

                  </p>

                  <span>
                    {item.project.name}
                  </span>

                </div>

              </motion.div>

            ))}

          </div>

        </div>

      </div>

    </div>
  );
}

export default Overview;
