import styles from "./Sidebar.module.css";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ImHome } from "react-icons/im";
import { FaUserGroup, FaFolderClosed } from "react-icons/fa6";
import { BiTask } from "react-icons/bi";
import { MdLiveHelp } from "react-icons/md";
import { FaRegBell, FaSearch, FaBars } from "react-icons/fa";

import Notifications from "../context/NotificationsContext";
import { useSearchModal } from "../context/SearchModalContext";

function Sidebar() {

  const location = useLocation();

  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);


  const { setOpen } = useSearchModal();

  const hasNotification = unreadCount > 0;
  //const hasNotification = 2;
  const fetchUnreadCount = async () => {
    const token = localStorage.getItem("access");

    const res = await fetch(
      "http://127.0.0.1:8000/notifications/unread-count/",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) return 0;

    const data = await res.json();

    return data.unread;
  };


  const handleUpdate = async () => {
      const count = await fetchUnreadCount();
      console.log(count)
      setUnreadCount(count);

    window.addEventListener("notification-updated", handleUpdate);

    return () => {
      window.removeEventListener("notification-updated", handleUpdate);
    };
  }



  // ===============================
  // FETCH USER
  // ===============================
  useEffect(() => {
  handleUpdate();
  fetchUser();

    // ==============

  const storedUser = localStorage.getItem("user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // =================
  const handleUserUpdate = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    };

    window.addEventListener("user-updated", handleUserUpdate);

    return () => {
      window.removeEventListener("user-updated", handleUserUpdate);
    };
  }, []);


  const fetchUser = async () => {

    const token = localStorage.getItem("access");
    if (!token) return;

    const res = await fetch("http://127.0.0.1:8000/accounts/me/", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return;

    const data = await res.json();

    const avatarUrl =
      `http://127.0.0.1:8000${data.avatarpath.replace(/\\/g, "/")}`;

    const userData = { ...data, avatarpath: avatarUrl };

    localStorage.setItem("user", JSON.stringify(userData));

    setUser(userData);
  };





  useEffect(() => {

    const path = location.pathname;

    if (path.startsWith("/group")) {
      localStorage.setItem("last_group_route", path);
    }

    if (path.startsWith("/projects")) {
      localStorage.setItem("last_project_route", path);
    }

    if (path.startsWith("/tasks")) {
      localStorage.setItem("last_task_route", path);
    }

  }, [location.pathname]);



  const getLastRoute = (key, fallback) => {
    return localStorage.getItem(key) || fallback;
  };



  const renderMenuItem = (to, icon, label, extra = null) => {

    const isActive = location.pathname.startsWith(to);

    return (

      <Link to={to}>

        <div
          className={`${styles.Menu} ${
            isActive ? styles.active : ""
          }`}
        >

          {extra ? extra : icon}

          {!collapsed && <h3>{label}</h3>}

          {collapsed && (
            <span className={styles.Tooltip}>{label}</span>
          )}

        </div>

      </Link>

    );
  };



  return (

    <div
      className={`${styles.Sidebar_container} ${
        collapsed ? styles.collapsed : ""
      }`}
    >

      {/* LOGO */}

      <div className={styles.Logo_container}>
        <img src="/logo.png" alt="logo" className={styles.Logo} />
        {!collapsed && <h2>MANAGER</h2>}
      </div>



      {/* TOGGLE BUTTON */}

      <button
        className={styles.ToggleBtn}
        onClick={() => setCollapsed(!collapsed)}
      >
        <FaBars />
      </button>



      <div className={styles.Menu_container}>

        {/* TOP MENU */}

        <div className={styles.Top_menu}>

          {!collapsed && (
            <div className={styles.SearchBar}>
              
              <button className={styles.searchBtn} onClick={() => setOpen(true)}>
                <FaSearch className={styles.SearchIcon} />
                Tìm kiếm
                {/* placeholder="Tìm kiếm..."
                
                className={styles.SearchInput} */}
              
              </button>
            </div>
          )}



          {renderMenuItem(
            "/overview",
            <ImHome className={styles.Icon} />,
            "Tổng quan"
          )}



          {renderMenuItem(
            getLastRoute("last_group_route", "/group"),
            <FaUserGroup className={styles.Icon} />,
            "Nhóm"
          )}



          {renderMenuItem(
            getLastRoute("last_project_route", "/projects"),
            <FaFolderClosed className={styles.Icon} />,
            "Dự án"
          )}



          {renderMenuItem(
            getLastRoute("last_task_route", "/tasks"),
            <BiTask className={styles.Icon} />,
            "Công việc"
          )}



          {renderMenuItem(
            "/notifications",
            null,
            "Thông báo",
            <div className={styles.BellWrapper}>
              <FaRegBell className={styles.Icon} />
              {hasNotification && (
                <span className={styles.Badge} />
              )}
            </div>
          )}

        </div>



        {/* BOTTOM MENU */}

        <div className={styles.Bottom_menu}>

          {renderMenuItem(
            "/profile",
            <img
              src={
                user?.avatarpath ||
                "/default-avatar.png"
              }
              alt="avatar"
              className={styles.Avatar}
            />,
            "Hồ sơ"
          )}



          {renderMenuItem(
            "/help",
            <MdLiveHelp className={styles.Icon} />,
            "Trợ giúp"
          )}

        </div>

      </div>

    </div>
  );
}

export default Sidebar;


