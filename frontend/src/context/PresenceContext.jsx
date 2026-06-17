import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

// import ReactDOM from "react-dom/client";
const PresenceContext = createContext();
const WS_BASE =
  import.meta.env.VITE_WS_BASE ||
  "ws://127.0.0.1:8000";


export const PresenceProvider = ({ children }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
      const token = localStorage.getItem("access");
      if (!token) return;

      let cancelled = false;
      let ws;

      const connect = () => {
          ws = new WebSocket(`${WS_BASE}/ws/presence/?token=${token}`);

          ws.onopen = () => console.log("Presence connected");

          ws.onmessage = (event) => {
              const data = JSON.parse(event.data);
              if (data.type === "presence_update") {
                  setOnlineUsers(data.online_users);
              }
          };

          ws.onerror = (e) => console.log("[Presence] error", e);

          ws.onclose = (e) => {
              console.log("[Presence] closed", e.code, e.reason);
              if (!cancelled && e.code !== 1000) {
                  setTimeout(connect, 2000);
              }
          };
      };

      connect();

      return () => {
          cancelled = true;
          if (ws) ws.close(1000, "unmount");
      };
  }, []);
  // useEffect(() => {
  //   const token = localStorage.getItem("access");

  //   if (!token) return;


  //   const ws = new WebSocket(
  //     `${WS_BASE}/ws/presence/?token=${token}`
  //   );

  //   ws.onopen = () => {
  //     console.log("Presence connected");
  //   };

  //   ws.onmessage = (event) => {
  //     const data = JSON.parse(event.data);
  //     console.log("[Presence] received:", data); 
  //     if (data.type === "presence_update") {
  //       setOnlineUsers(data.online_users);
  //     }
  //   };

  //   return () => {
  //     ws.close();
  //   };
  // }, []);

  return (
    <PresenceContext.Provider
      value={{
        onlineUsers,
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => {
  return useContext(PresenceContext);
};