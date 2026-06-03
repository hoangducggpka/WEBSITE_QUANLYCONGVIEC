import React, { useState, useEffect, useRef } from "react";
import styles from "./Group.module.css";
import { FaFolder } from "react-icons/fa6";
import { MdGroup, MdPersonAdd, MdMoreVert } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
const Group = ({
  leader,
  leaderAvatar,
  title,
  filesCount,
  membersCount,
  avatarUrl,
  color,
  uuid,
  onAddMember,
  onLeaveGroup,
  onDeleteGroup
}) => {

  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);



  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      className={styles.groupCard}
      
      style={{
        background: `linear-gradient(-45deg, #ff0000ff, ${
          !color || color === "none" ? "#000" : `var(--${color})`
        })`,
      }}
    >
      {/* Leader */}
      <div className={styles.leaderRow}>
        <img
          src={leaderAvatar}
          alt="leader-avatar"
          className={styles.leaderAvatar}
        />
        <p className={styles.leader}>{leader}</p>
      </div>

      {/* Title */}
      <h3 className={styles.title} onClick={() => navigate(`/groups/${uuid}`)}>{title}</h3>

      {/* Info row */}
      <div className={styles.info}>
        <span className={styles.infoItem} >
          <FaFolder className={styles.icon} /> {filesCount}
        </span>
        <span className={styles.infoItem}>
          <MdGroup className={styles.icon} /> {membersCount}
        </span>
      </div>

      {/* Avatar list + actions */}
      <div className={styles.bottomRow}>
        <div className={styles.avatars}>
          {avatarUrl.slice(0, 4).map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`member-${index}`}
              className={styles.avatar}
            />
          ))}
          {avatarUrl.length > 4 && (
            <div className={styles.more}>+{avatarUrl.length - 4}</div>
          )}
        </div>

        <div className={styles.actions}>
          {/* Add member button */}
          <button className={styles.iconBtn} 
                  title="Thêm thành viên" 
                  // onClick={() => setShowAddForm(true)}
                  onClick={() => onAddMember(uuid)}
          >
            <MdPersonAdd />
          </button>
          {/* Kebab menu */}
          <div className={styles.kebabMenu} ref={menuRef}>
            <button
              className={styles.iconBtn}
              onClick={() => setMenuOpen(!menuOpen)}
              title="Menu"
            >
              <MdMoreVert />
            </button>
            {menuOpen && (
              <div className={styles.dropdown}>
                <button className={styles.dropdownItem} onClick={() => onLeaveGroup(uuid)}>Rời nhóm</button>
                {/* <button className={styles.dropdownItem}>Tùy chỉnh</button> */}
                <button className={styles.dropdownItem} onClick={() => onDeleteGroup(uuid)}>Xóa nhóm</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Group;