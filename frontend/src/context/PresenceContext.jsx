import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

// import ReactDOM from "react-dom/client";
import {
  WS_BASE
} from "../config/env";
const PresenceContext = createContext();


export const PresenceProvider = ({ children }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("access");

    if (!token) return;


    const ws = new WebSocket(
      `${WS_BASE}/ws/presence/?token=${token}`
    );

    ws.onopen = () => {
      console.log("Presence connected");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "presence_update") {
        setOnlineUsers(data.online_users);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

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