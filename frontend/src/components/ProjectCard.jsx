import styles from "./ProjectCard.module.css";
import { IoChatboxEllipses } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

import React, { useState, useRef, useEffect } from "react";

function ProjectCard({
  projectId,
  projectName,
  startDate,
  endDate,
  progress,
  commentCount,
  isRead = true,
  members = [],
  isSelected,
  onToggleSelect,
  color,
  onEdit
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <div  onClick={() => navigate(`/projects/${projectId}`)} className={styles.card} style={{
        background: `linear-gradient(45deg, #34455fff, ${
          !color || color === "none" ? "#000" : `var(--${color})`
        })`,
      }}>
      {/* CHECKBOX */}
      <div className={styles.checkbox}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <span className={styles.projectName}>{projectName}</span>
        </div>
        
        <div className={styles.moreWrapper} ref={menuRef}>
          {/* <button
            className={styles.moreBtn}
            onClick={() => setShowMenu((prev) => !prev)}
          >
            ⋮
          </button> */}

          {showMenu && (
            <div className={styles.dropdown}>
              <div
                className={styles.dropdownItem}
                onClick={() => {
                  setShowMenu(false);
                  onEdit(projectId);
                }}
              >
                Tùy chỉnh
              </div>

              <div className={styles.dropdownItem}>
                Màu sắc
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PROGRESS */}
      <div className={styles.progressSection}>
        <div className={styles.progressLabel}>Tiến trình</div>
        <div className={styles.progressRow}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={styles.progressValue}>{progress}%</span>
        </div>
      </div>

      {/* FOOTER */}
      <div className={styles.footer}>
        <div className={styles.date}>
          Thời hạn
          <br />
          <strong>
            {startDate} - {endDate}
          </strong>
        </div>

        <div className={styles.right}>
          {/* COMMENT */}
          {/* <div className={styles.comment}>
            <IoChatboxEllipses className={styles.commentIcon} />
            {!isRead && <span className={styles.unreadDot} />}
            <span>{commentCount}</span>
          </div> */}

          {/* MEMBERS */}
          <div className={styles.members}>
            {members.slice(0, 4).map((m) => (
              <img
                key={m.user_id}
                src={m.avatarPath}
                alt=""
                className={styles.avatar}
              />
            ))}

            {members.length > 4 && (
              <div className={styles.moreMember}>
                +{members.length - 4}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectCard;




