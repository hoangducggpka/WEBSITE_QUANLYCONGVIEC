//src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../utils/api";
const AuthContext = createContext();

const API_BASE = "http://127.0.0.1:8000/accounts";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const isAdmin = user?.is_staff;

  const fetchProfile = async (token) => {

      try {

          const res = await apiFetch(`/accounts/me/`, {
              headers: {
                  Authorization: `Bearer ${token}`,
              },
          });

          if (!res.ok) {
              throw new Error();
          }

          const profile = await res.json();

          setUser(profile);

          return profile;

      } catch (err) {

          console.error(err);

          logout();

          return null;
      }
  };
  // const fetchProfile = async (token) => {
  //   try {
  //     const res = await apiFetch(`/accounts/me/`, {
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       },
  //     });

  //     if (!res.ok) throw new Error();

  //     const profile = await res.json();

  //     setUser(profile);
  //   } catch (err) {
  //     console.error(err);
  //     logout();
  //   }
  // };

  useEffect(() => {
      const initAuth = async () => {

          const access = localStorage.getItem("access");

          const refresh = localStorage.getItem("refresh");

          if (access && refresh) {

              setAccessToken(access);

              setRefreshToken(refresh);

              await fetchProfile(access);
          }

          setLoading(false);
      };

      initAuth();
  }, []);

  const login = async (access, refresh) => {

      setAccessToken(access);
      setRefreshToken(refresh);

      localStorage.setItem("access", access);
      localStorage.setItem("refresh", refresh);

      const profile = await fetchProfile(access);

      return profile;
  };

  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

