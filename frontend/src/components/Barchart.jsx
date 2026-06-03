import React from "react";
import styles from "./Barchart.module.css";

const Barchart = ({ todo, inprogress, stuck, done, overdue }) => {
  const data = [
    { label: "Phải làm", value: todo, color: "#f39c12" },
    { label: "Đang làm", value: inprogress, color: "#3498db" },
    { label: "Gặp trục trặc", value: stuck, color: "#f1c40f" },
    { label: "Đã xong", value: done, color: "#2ecc71" },
    { label: "Quá hạn", value: overdue, color: "#e74c3c" },
  ];

  const maxValue = Math.max(...data.map(item => item.value), 1);

  return (
    <div className={styles.chartContainer}>
      {data.map((item, index) => (
        <div key={index} className={styles.barRow}>
          <span className={styles.barLabel}>{item.label}</span>

          <div className={styles.barTrack}>
            <div
              className={styles.bar}
              style={{
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color,
              }}
            >
              <span className={styles.barValue}>{item.value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Barchart;
