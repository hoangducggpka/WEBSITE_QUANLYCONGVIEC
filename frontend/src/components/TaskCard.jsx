import React from "react";
import styles from "./TaskCard.module.css";

const TaskCard = ({
  avatarUrl,
  name,
  userCode,
  status,        // ví dụ: "❗Tạm dừng"
  job,           // mô tả công việc
  deadline,      // hạn chót
  reason,        // nguyên nhân
  supportLabel,  // text nút hỗ trợ, ví dụ: "Hỗ trợ qua Zalo!"
  onSupportClick // callback khi bấm nút hỗ trợ
}) => {
  return (
    <div className={styles.card}>
      {/* <div className={styles.header}>
        <div className={styles.box}>
          <img src={avatarUrl} alt="avatar" className={styles.avatar} />
          <div className={styles.info}>
            <h3 className={styles.name}>{name}</h3>
            <h3 className={styles.name}>{userCode}</h3>
          </div>
        </div>
        <div className={styles.box1}>
          <span className={styles.status}>{status}</span>
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Công việc</span>
        <p className={styles.text}>{job}</p>
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Hạn chót</span>
        <p className={styles.text}>{deadline}</p>
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Nguyên nhân</span>
        <p className={styles.text}>{reason}</p>
      </div>

      <button className={styles.supportBtn} onClick={onSupportClick}>
        {supportLabel}
      </button> */}
    </div>
  );
};

export default TaskCard;