import styles from "./NavBar.module.css"
import { LuBell } from "react-icons/lu";
import { LuBellDot } from "react-icons/lu";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { RiMessageFill } from "react-icons/ri";
import { FaCaretDown } from "react-icons/fa";

import { useAuth } from "../context/AuthContext";

import { RiCloseCircleFill } from "react-icons/ri";
function NavBar(){
    const { user, logout } = useAuth();
    const [active, setActive] = useState("Tổng quan");
    const navigate = useNavigate();
    const [openDropdown, setOpenDropdown] = useState(false);
    const [openNotification, setOpenNotification] = useState(false);
    const profileRef = useRef(null);

    const MEDIA_URL = "http://127.0.0.1:8000";

    const [unreadNotifications, setUnreadNotifications] = useState(3);
    const [unreadMessages, setUnreadMessages] = useState(5);
    const notifications = [
        {
            id: 1,
            type: "leader",
            title: "Nguyễn Văn A đã giao việc mới",
            description: "Thiết kế lại dashboard UI",
            time: "5 phút trước",
            unread: true,
            avatar: "/5.png"
        },

        {
            id: 2,
            type: "system",
            title: "Hệ thống cập nhật",
            description: "Server sẽ bảo trì lúc 23:00",
            time: "1 giờ trước",
            unread: false
        },

        {
            id: 3,
            type: "leader",
            title: "Leader đã phản hồi task",
            description: "Cần chỉnh sửa phần responsive",
            time: "2 giờ trước",
            unread: true,
            avatar: "/5.png"
        }
    ];

    const handleClick = (item) => {
        setActive(item);
        localStorage.setItem("current_page", item);
        if (item === "Tổng quan") navigate("/overview");
        if (item === "Dự án") {
            const lastRoute = localStorage.getItem("project_page_last_route");

                if (lastRoute) {
                    navigate(lastRoute);
                } else {
                    navigate("/projects");
                }
        }
        if (item === "Nhóm") {
            const lastRoute = localStorage.getItem("group_page_last_route");

                if (lastRoute) {
                    navigate(lastRoute);
                } else {
                    navigate("/groups");
                }
        }
        if (item === "Công việc") navigate("/tasks");
    };
    useEffect(() => {
        const savedPage = localStorage.getItem("current_page");
        if (savedPage) {
        setActive(savedPage);
        if (savedPage === "Tổng quan") navigate("/overview");
        if (savedPage === "Dự án") {
            const lastRoute = localStorage.getItem("project_page_last_route");

                if (lastRoute) {
                    navigate(lastRoute);
                } else {
                    navigate("/projects");
                }
        }
        if (savedPage === "Nhóm") {
            const lastRoute = localStorage.getItem("group_page_last_route");

                if (lastRoute) {
                    navigate(lastRoute);
                } else {
                    navigate("/groups");
                }
        }
        if (savedPage === "Công việc") navigate("/tasks");
        }
    }, []);
    return(
        <>
            <div className={styles.navbar_container}>
                <div className={styles.navbar}>
                    <div className={styles.logo_container}>
                        <img src="/logo.png" alt="logo" className={styles.logo} />
                    </div>
                    <div className={styles.menu}>
                        {["Tổng quan","Dự án","Nhóm","Công việc"].map(item => (
                            <button
                            key={item}
                            onClick={() => handleClick(item)}
                            className={`${styles.menu_button} ${active === item ? styles.active : ""}`}
                            >
                            {item}
                            </button>
                        ))}
                    </div>
                    <div className={styles.personal}>
                        <div
                            className={styles.notification_wrapper}
                        >
                            <div
                                className={styles.icon_container}
                                onClick={() => {

                                    if (openDropdown) {
                                        setOpenDropdown(false);
                                    }

                                    setOpenNotification(prev => !prev);
                                }}
                            >
                                <LuBell className={styles.icon} />

                                {unreadNotifications > 0 && (
                                    <span className={styles.badge}>
                                        {unreadNotifications > 9
                                            ? "9+"
                                            : unreadNotifications}
                                    </span>
                                )}
                            </div>

                            {openNotification && (
                                <div className={styles.notification}>

                                    <div className={styles.notification_header}>

                                        <h3>Thông báo</h3>

                                        <div className={styles.notification_actions}>

                                            <button className={styles.read_all}>
                                                Đánh dấu đã đọc
                                            </button>

                                            <button
                                                className={styles.close_button}
                                                onClick={() => setOpenNotification(false)}
                                            >
                                                <RiCloseCircleFill />
                                            </button>

                                        </div>
                                    </div>

                                    <div className={styles.notification_list}>
                                        {notifications.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`${styles.notification_item}
                                                ${item.unread ? styles.unread : ""}`}
                                            >
                                                <div className={styles.notification_avatar}>

                                                    {item.type === "leader" ? (
                                                        <img
                                                            src={item.avatar}
                                                            alt=""
                                                            className={
                                                                styles.notification_avatar_img
                                                            }
                                                        />
                                                    ) : (
                                                        <div className={styles.system_avatar}>
                                                            SYS
                                                        </div>
                                                    )}

                                                </div>

                                                <div className={styles.notification_content}>

                                                    <div className={styles.notification_title}>
                                                        {item.title}
                                                    </div>

                                                    <div className={styles.notification_description}>
                                                        {item.description}
                                                    </div>

                                                    <div className={styles.notification_time}>
                                                        {item.time}
                                                    </div>

                                                </div>

                                                {item.unread && (
                                                    <div className={styles.unread_dot}></div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                </div>
                            )}
                        </div>
                        <div className={styles.icon_container}>
                            <RiMessageFill className={styles.icon} onClick={() => navigate("/messages")}/>

                            {unreadMessages > 0 && (
                                <span className={styles.badge}>
                                    {unreadMessages > 9 ? "9+" : unreadMessages}
                                </span>
                            )}
                        </div>
                        <div
                            className={styles.profile}
                            ref={profileRef}
                            onClick={() => {
                                if (openNotification) {
                                    setOpenNotification(false);
                                }

                                setOpenDropdown(prev => !prev);
                            }}
                        >
                            <div className={styles.avatar_container}>
                                <img
                                    src={
                                        user?.avatarpath
                                            ? `${MEDIA_URL}${user.avatarpath}`
                                            : "/5.png"
                                    }
                                    alt="avatar"
                                    className={styles.avatar}
                                />
                            </div>

                            <div>
                                <FaCaretDown />
                            </div>

                            {openDropdown && (
                                <div className={styles.dropdown}>
                                    <button className={styles.dropdown_item} onClick={()=> navigate("/profile")}>
                                        Hồ sơ
                                    </button>

                                    <button className={styles.dropdown_item}>
                                        Cài đặt
                                    </button>

                                    <button className={styles.dropdown_item}>
                                        Trợ giúp
                                    </button>

                                    <button
                                        className={styles.dropdown_item}
                                        onClick={() => {
                                            logout();
                                            navigate("/login");
                                        }}
                                    >
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                        {/* <div className={styles.profile} ref={profileRef}  onClick={() => {
                                if (openNotification) {
                                    setOpenNotification(false);
                                }

                                setOpenDropdown(prev => !prev);
                            
                            }}>
                            <div className={styles.avatar_container}>
                                <img
                                    src={
                                        user?.avatarpath
                                            ? `${MEDIA_URL}${user.avatarpath}`
                                            : "/4.png"
                                    }
                                    alt="avatar"
                                    className={styles.avatar}
                                />
                            </div>
                            <div>
                                <FaCaretDown />
                            </div>
                            {openDropdown && (
                                <div className={styles.dropdown}>
                                    <button className={styles.dropdown_item}>Hồ sơ</button>
                                    <button className={styles.dropdown_item}>Cài đặt</button>
                                    <button className={styles.dropdown_item}>Trợ giúp</button>
                                    <button className={styles.dropdown_item}>Đăng xuất</button>
                                </div>
                            )}
                        </div> */}
                    </div>
                </div>
            </div>
        </>
    )
}

export default NavBar;