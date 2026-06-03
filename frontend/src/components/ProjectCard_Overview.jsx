import React from "react";
import styles from "./ProjectCard_Overview.module.css";
import { IoChatboxEllipses } from "react-icons/io5";
import { HiOutlineUserGroup } from "react-icons/hi";

const ProjectCard_Overview = ({
  title,
  progress,
  deadline,
  memberList,
  comments, // callback từ OverviewPage để thay đổi trạng thái comment
}) => {
  const memberCount = memberList.length;
  const commentCount = comments.length;
  const displayMembers =
    memberCount > 5 ? memberList.slice(0, 4) : memberList;

  return (
    <div className={styles.card}>
      <p className={styles.title}>{title}</p>

      {/* Progress */}
      <span className={styles.label}>Tiến trình</span>
      <div className={styles.progressWrapper}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={styles.progressText}>{progress}%</span>
      </div>

      {/* Deadline */}
      <div className={styles.deadline}>
        <p>Thời hạn</p>
        <span>{deadline}</span>
      </div>

      {/* Members */}
      <div className={styles.members}>
        <div className={styles.box1}>
          <IoChatboxEllipses className={styles.commentIcon} />
          <div className={styles.box2}>
            <span>{commentCount}</span>
          </div>
        </div>
        <div className={styles.box1}>
          <HiOutlineUserGroup className={styles.memberIcon} />
          <div className={styles.box2}>
            <span>{memberCount}</span>
          </div>
        </div>
        <div className={styles.avatarList}>
          {displayMembers.map((member) => (
            <img
              key={member.user_id}
              src={member.avatarUrl}
              alt="avatar"
              className={styles.avatar}
            />
          ))}
          {memberCount > 5 && (
            <div className={styles.moreAvatar}>+{memberCount - 4}</div>
          )}
        </div>
              {/* Comments */}

      </div>


    </div>
  );
};

export default ProjectCard_Overview;