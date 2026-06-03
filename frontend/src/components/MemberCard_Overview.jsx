import React from "react";
import styles from "./MemberCard_Overview.module.css";
import { MdOutlineStars } from "react-icons/md";
import { IoCheckmarkDoneCircle } from "react-icons/io5";

const MemberCard_Overview = ({
  avatarUrl,
  memberName,
  userCode,
  jobName,
  deadline, 
  completedAt,
  status,
}) => {
  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header_container}>
        <div className={styles.header}>
          <img src={avatarUrl} className={styles.avatar} />
          <div>
            <h3 className={styles.name}>{memberName}</h3>
            <h3 className={styles.name}>{userCode}</h3>
          </div>
        </div>
      </div>

      {/* Job Info */}
      <div className={styles.info}>
        <p className={styles.label}>Công việc</p>
        <p className={styles.content}>{jobName}</p>
        <div className={styles.deadline_container}>
          <div>
            <p className={styles.label}>Hạn chót</p>
            <p className={styles.datetime}>{deadline}</p>
          </div>
          <div className={styles.Status}>
            <p className={styles.label}>Trạng thái</p>
            <div className={styles.box1}>
              <IoCheckmarkDoneCircle className={styles.completeIcon}/>
              <p className={styles.content}>{status}</p>
            </div>
          </div>
        </div>
        <p className={styles.label}>Hoàn thành</p>
        <p className={styles.datetime}>{completedAt}</p>
      </div>

      {/* Status */}
      {/* <div className={styles.status}>
        <img src="/done.png" alt="Complete" className={styles.completeIcon} />
        <span className={styles.status_text}>{status}</span>
      </div> */}

      {/* Rating */}
        <div className={styles.rating}>
          <MdOutlineStars className={styles.ratingIcon}/>
          <span>Đánh giá ngay!</span>
        </div>
    </div>
  );
};

export default MemberCard_Overview;