//src/page/Login.jsx
import React, { useState } from "react";
import styles from "./Login.module.css";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { extractFirstError } from "../utils/api"; 

// const API_BASE = import.meta.env.VITE_API_URL ?? "";
const API_BASE =
    import.meta.env.VITE_API_BASE || "";

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();
  

  const [form, setForm] = useState({
    username: "",
    password: "",
    fullname: "",
    email: "",
    address: "",
    phone: "",
    avatarpath: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    alert(import.meta.env.VITE_API_BASE)
    try {
      const res = await fetch(`${API_BASE}/accounts/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: form.username,
          password: form.password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Đăng nhập thất bại, vui lòng thử lại!");
      }

      const profile = await login(data.access, data.refresh);

      if (profile?.is_staff) {
        navigate("/security");
      } else {
        navigate("/overview");
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
      setLoading(true);
      setError("");

      try {
          const res = await fetch(`${API_BASE}/register/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  username: form.username,
                  password: form.password,
                  fullname: form.fullname,
                  address: form.address,
                  email: form.email,
                  phone: form.phone
              })
          });

          const data = await res.json();

          if (!res.ok) {
              throw new Error(extractFirstError(data));
          }

          await handleLogin();
      } catch (err) {
          setError(err.message);
      } finally {
          setLoading(false);
      }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    isRegister ? handleRegister() : handleLogin();
  };

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.container} ${isRegister ? styles.active : ""}`}>

        <div className={styles.formContainer}>
          <h2>{isRegister ? "Đăng ký" : "Đăng nhập"}</h2>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <input
                  type="text"
                  name="fullname"
                  placeholder="Họ và tên"
                  onChange={handleChange}
                  required
                />

                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  onChange={handleChange}
                  required
                />

                <input
                  type="text"
                  name="address"
                  placeholder="Địa chỉ"
                  onChange={handleChange}
                />

                <input
                  type="text"
                  name="phone"
                  placeholder="Số điện thoại"
                  onChange={handleChange}
                />
              </>
            )}

            <input
              type="text"
              name="username"
              placeholder="Tên đăng nhập"
              onChange={handleChange}
              required
            />

            <input
              type="password"
              name="password"
              placeholder="Mật khẩu"
              onChange={handleChange}
              required
            />

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" disabled={loading}>
              {loading ? "Đang xử lý..." : isRegister ? "Đăng ký" : "Đăng nhập"}
            </button>
          </form>

          <p className={styles.switchText}>
            {isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"}
            <span onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? " Đăng nhập" : " Đăng ký"}
            </span>
          </p>
        </div>

        <div className={styles.sidePanel}>
          <h1>{isRegister ? "Chào mừng!" : "Chào mừng trở lại!"}</h1>
          <p>
            {isRegister
              ? "Tạo tài khoản để bắt đầu sử dụng hệ thống."
              : "Đăng nhập để tiếp tục."}
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
