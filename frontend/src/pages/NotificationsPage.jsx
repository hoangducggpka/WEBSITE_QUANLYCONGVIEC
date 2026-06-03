import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./NotificationsPage.module.css";
import { apiFetch } from "../utils/api";

const NotificationsPage = () => {
  const [notificationList, setNotificationList] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [selectedNotification, setSelectedNotification] = useState(null);

  const observer = useRef();
  const didFetch = useRef(false);

  const handleClearAll = async () => {
  const confirmDelete = window.confirm(
      "Bạn có chắc muốn xóa tất cả thông báo không?"
    );

    if (!confirmDelete) return;

    try {
      const res = await apiFetch("/notifications/delete-all/", {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Xóa thất bại");

      alert(data.message || "Đã xóa tất cả thông báo");

      setNotificationList([]);
      setNextPage(null);
      setTotal(0);
      window.dispatchEvent(new Event("notification-updated"));

    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // ================= FETCH =================
  const fetchNotifications = async (url) => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await apiFetch(url);
      const data = await res.json();

      const payload = data.results;

      setNotificationList((prev) => [
        ...prev,
        ...payload.messages
      ]);

      setNextPage(data.next?.replace("http://127.0.0.1:8000", ""));
      setTotal(payload.all);
      console.log("FETCH CALLED");
    } catch (err) {
      console.error(err);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    fetchNotifications("/notifications/list/");
  }, []);

  // ================= SORT =================
  const sortedNotifications = useMemo(() => {
    return [...notificationList].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }, [notificationList]);


  const markAsRead = async (id) => {
    const noti = notificationList.find((n) => n.id === id);

    if (!noti?.is_private) return;

    await apiFetch(`/notifications/${id}/read/`, {
      method: "PATCH"
    });

    setNotificationList((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      )
    );
  };

  const markAllAsRead = async () => {
    const privateUnread = notificationList.filter(
      (n) => !n.is_read && n.is_private
    );

    if (privateUnread.length === 0) return;

    await apiFetch("/notifications/read-all/", {
      method: "PATCH"
    });
    
    setNotificationList((prev) =>
      prev.map((n) =>
        n.is_private ? { ...n, is_read: true } : n
      )
    );
    window.dispatchEvent(new Event("notification-updated"));
  };

  // ================= MODAL =================
  const parseContent = (content) => {
    const parts = content.split("|").map((p) => p.trim());

    return {
      from: parts[0],
      group: parts[1],
      action: parts[2],
      time: parts[3]
    };
  };

  const handleClickNotification = async (n) => {
    await markAsRead(n.id);
    setSelectedNotification(n);
  };

  // ================= TIME =================
  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now - created;

    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  };

  const unreadCount = notificationList.filter(
    (n) => !n.is_read && n.is_private
  ).length;

  // ================= INFINITE SCROLL =================
  const lastElementRef = (node) => {
    if (loading) return;

    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && nextPage) {
        fetchNotifications(nextPage);
      }
    });

    if (node) observer.current.observe(node);
  };

  // ================= UI =================
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>Thông báo ({total})</h2>

        <div className={styles.actions}>

          <button
            className={styles.markAllBtn}
            onClick={markAllAsRead}
          >
            Đánh dấu đã đọc ({unreadCount})
          </button>
          <button className={styles.clearAllBtn} onClick={handleClearAll}>
            Xóa tất cả
          </button>
        </div>
      </div>

      <div className={styles.list}>
        {sortedNotifications.map((n, index) => {
          const isLast = index === sortedNotifications.length - 1;

          return (
            <div
              ref={isLast ? lastElementRef : null}
              key={n.id}
              className={`${styles.card} ${
                !n.is_read ? styles.unread : ""
              }`}
            >

              <div
                className={styles.body}
                onClick={() => handleClickNotification(n)}
              >
                <div className={styles.content}> Từ <span className={styles.bold}>[{parseContent(n.content).from}]</span>: <span className={styles.italic}>{parseContent(n.content).action}</span></div>

                <div className={styles.meta}>
                  <span className={styles.time}>
                    {formatTimeAgo(n.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {notificationList.length === 0 && (
          <div className={styles.empty}>
            Không có thông báo nào
          </div>
        )}
      </div>

      {/* MODAL */}
      {selectedNotification && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            {(() => {
              const data = parseContent(selectedNotification.content);

              return (
                <>
                  <h3>Chi tiết thông báo</h3>
                  <p><b>{data.from}</b></p>
                  <p>{data.group}</p>
                  <p>{data.action}</p>
                  <p>{data.time}</p>
                </>
              );
            })()}

            <button
              onClick={() => setSelectedNotification(null)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;



