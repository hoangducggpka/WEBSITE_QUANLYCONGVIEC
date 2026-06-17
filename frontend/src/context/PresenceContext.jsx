import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const PresenceContext = createContext();
const WS_BASE = import.meta.env.VITE_WS_BASE || "ws://127.0.0.1:8000";

export const PresenceProvider = ({ children }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      // Luôn đọc token MỚI NHẤT tại thời điểm connect, không dùng token cũ trong closure
      const token = localStorage.getItem("access");
      if (!token) {
        // Chưa có token (chưa login / đang refresh) -> thử lại sau, không spam liên tục
        clearReconnectTimer();
        reconnectTimerRef.current = setTimeout(connect, 1000);
        return;
      }

      const ws = new WebSocket(`${WS_BASE}/ws/presence/?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Presence] connected");
        reconnectAttemptRef.current = 0; // reset backoff khi connect thành công
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "presence_update") {
            setOnlineUsers(data.online_users ?? []);
          }
        } catch (e) {
          console.error("[Presence] parse error", e);
        }
      };

      ws.onerror = (e) => {
        console.log("[Presence] error", e);
      };

      ws.onclose = (e) => {
        console.log("[Presence] closed", e.code, e.reason);
        wsRef.current = null;

        if (cancelled) return;

        // 1000 = đóng chủ động (unmount) -> không reconnect
        if (e.code === 1000) return;

        // 401/4001 hoặc 1011 (server error do token cũ/hết hạn) -> chờ token mới
        // rồi reconnect với backoff tăng dần để tránh spam khi BE đang lỗi thật
        reconnectAttemptRef.current += 1;
        const delay = Math.min(1000 * 2 ** reconnectAttemptRef.current, 15000);

        clearReconnectTimer();
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    // Lắng nghe khi access token được cập nhật (login, refresh token...)
    // Yêu cầu: nơi nào set lại localStorage "access" sau khi refresh thì
    // cũng nên dispatch một CustomEvent("access-token-updated") để Provider
    // biết và reconnect ngay bằng token mới, không cần chờ lỗi 401/1011 xảy ra.
    const handleTokenUpdated = () => {
      console.log("[Presence] token updated -> reconnecting with fresh token");
      reconnectAttemptRef.current = 0;
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.close(1000, "token refreshed");
      } else {
        connect();
      }
    };

    window.addEventListener("access-token-updated", handleTokenUpdated);

    return () => {
      cancelled = true;
      clearReconnectTimer();
      window.removeEventListener("access-token-updated", handleTokenUpdated);
      if (wsRef.current) {
        wsRef.current.close(1000, "unmount");
        wsRef.current = null;
      }
    };
  }, []);

  return (
    <PresenceContext.Provider value={{ onlineUsers }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => {
  return useContext(PresenceContext);
};

// import React, {
//   createContext,
//   useContext,
//   useEffect,
//   useState,
// } from "react";

// // import ReactDOM from "react-dom/client";
// const PresenceContext = createContext();
// const WS_BASE =
//   import.meta.env.VITE_WS_BASE ||
//   "ws://127.0.0.1:8000";


// export const PresenceProvider = ({ children }) => {
//   const [onlineUsers, setOnlineUsers] = useState([]);

//   useEffect(() => {
//       const token = localStorage.getItem("access");
//       if (!token) return;

//       let cancelled = false;
//       let ws;

//       const connect = () => {
//           ws = new WebSocket(`${WS_BASE}/ws/presence/?token=${token}`);

//           ws.onopen = () => console.log("Presence connected");

//           ws.onmessage = (event) => {
//               const data = JSON.parse(event.data);
//               if (data.type === "presence_update") {
//                   setOnlineUsers(data.online_users);
//               }
//           };

//           ws.onerror = (e) => console.log("[Presence] error", e);

//           ws.onclose = (e) => {
//               console.log("[Presence] closed", e.code, e.reason);
//               if (!cancelled && e.code !== 1000) {
//                   setTimeout(connect, 2000);
//               }
//           };
//       };

//       connect();

//       return () => {
//           cancelled = true;
//           if (ws) ws.close(1000, "unmount");
//       };
//   }, []);
//   // useEffect(() => {
//   //   const token = localStorage.getItem("access");

//   //   if (!token) return;


//   //   const ws = new WebSocket(
//   //     `${WS_BASE}/ws/presence/?token=${token}`
//   //   );

//   //   ws.onopen = () => {
//   //     console.log("Presence connected");
//   //   };

//   //   ws.onmessage = (event) => {
//   //     const data = JSON.parse(event.data);
//   //     console.log("[Presence] received:", data); 
//   //     if (data.type === "presence_update") {
//   //       setOnlineUsers(data.online_users);
//   //     }
//   //   };

//   //   return () => {
//   //     ws.close();
//   //   };
//   // }, []);

//   return (
//     <PresenceContext.Provider
//       value={{
//         onlineUsers,
//       }}
//     >
//       {children}
//     </PresenceContext.Provider>
//   );
// };

// export const usePresence = () => {
//   return useContext(PresenceContext);
// };