import React, { useState } from "react";
import styles from "./Login.module.css";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";


const API_BASE = "http://127.0.0.1:8000/accounts";

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

    try {
      const res = await fetch(`${API_BASE}/login/`, {
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
        throw new Error(data.detail || "Login failed");
      }

      // localStorage.setItem("access", data.access);
      // localStorage.setItem("refresh", data.refresh);

      await login(data.access, data.refresh);
      navigate("/overview");

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
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          fullname: form.fullname,
          address:form.address,
          email: form.email,
          phone:form.phone
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error("Register failed");
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
          <h2>{isRegister ? "Register" : "Login"}</h2>

          <form onSubmit={handleSubmit}>
            {/* {isRegister && (
              <>
                <input
                  type="text"
                  name="fullname"
                  placeholder="Full name"
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
              </>
            )} */}
            {isRegister && (
              <>
                <input
                  type="text"
                  name="fullname"
                  placeholder="Full name"
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
                  placeholder="Address"
                  onChange={handleChange}
                />

                <input
                  type="text"
                  name="phone"
                  placeholder="Phone"
                  onChange={handleChange}
                />
              </>
            )}

            <input
              type="text"
              name="username"
              placeholder="Username"
              onChange={handleChange}
              required
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              onChange={handleChange}
              required
            />

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" disabled={loading}>
              {loading ? "Processing..." : isRegister ? "Register" : "Login"}
            </button>
          </form>

          <p className={styles.switchText}>
            {isRegister ? "Already have an account?" : "Don't have an account?"}
            <span onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? " Login" : " Register"}
            </span>
          </p>
        </div>

        <div className={styles.sidePanel}>
          <h1>{isRegister ? "Welcome!" : "Hello Again!"}</h1>
          <p>
            {isRegister
              ? "Create your account to access the system."
              : "Login to continue your journey."}
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
