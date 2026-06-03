import styles from "./TaskCardTaskPage.module.css";
import { IoIosWarning } from "react-icons/io";

const STATUS_MAP = {
  done: "Hoàn thành",
  stuck: "Gặp trục trặc",
  todo: "Phải làm",
  inprogress: "Đang làm",
  overdue: "Quá hạn",
};

export default function TaskCardTaskPage({
  task,
  onStatusChange,
  }) {

  const handleChange = (e) => {
    const newStatus = e.target.value;

    if (newStatus === task.status) return;

    onStatusChange?.(task.id, newStatus);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Không có";

    return new Date(timestamp).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isOverdue =
    task.endDate < Date.now() && task.status !== "done";

  return (
    <div className={`${styles.card} ${styles[task.status]}`}>

      {/* HEADER */}
      <div className={styles.header}>
        <h3 className={styles.title}>{task.title}</h3>
      </div>

      {/* META */}
      <div className={styles.meta}>

        <p className={styles.project}>
          {task.project}
        </p>
        <p className={styles.timeRange}>
          Thời gian:
          <span>
            {formatDate(task.startDate)} → {formatDate(task.endDate)}
          </span>

          {isOverdue && (
            <IoIosWarning className={styles.iconwarning} />
          )}
        </p>

      </div>

      {/* FOOTER */}
      <div className={styles.footer}>
        {task.status === "overdue" ? (
          <div className={styles.overdueLabel}>
            {STATUS_MAP["overdue"]}
          </div>
        ) : (
          <select
            className={styles.statusSelect}
            value={task.status}
            onChange={handleChange}
          >
            {Object.entries(STATUS_MAP)
              .filter(([key]) => key !== "overdue")
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </select>
        )}
      </div>

    </div>
  );
}