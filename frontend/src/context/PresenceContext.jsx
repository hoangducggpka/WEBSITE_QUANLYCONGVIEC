import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const PresenceContext = createContext();

export const PresenceProvider = ({ children }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("access");

    if (!token) return;

    const ws = new WebSocket(
      `ws://127.0.0.1:8000/ws/presence/?token=${token}`
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