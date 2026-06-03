import React, { useEffect, useState } from "react";
import styles from "./Profile.module.css";
import { apiFetch } from "../utils/api";
import { logoutRequest } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { FaDeleteLeft } from "react-icons/fa6";

const Profile = () => {
  const [user, setUser] = useState(null);

  const [isAvatarModalOpen, setAvatarModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);

  const [avatarFile, setAvatarFile] = useState(null);

  const [form, setForm] = useState({
    fullname: "",
    email: "",
    phone: "",
    user_code: "",
    address: "",
  });

  const { logout } = useAuth();

  const handleLogout = async () => {
    const confirmLeave = window.confirm("Bạn chắc chắn muốn đăng xuất?");
    if (!confirmLeave) return;
    await logoutRequest();
    logout();
  };

  const [skills, setSkills] = useState([]);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [newSkill, setNewSkill] = useState("");

  const handleCreateSkill = async () => {
    if (!newSkill.trim()) return alert("Nhập tên skill");

    try {
      const token = localStorage.getItem("access");

      const res = await apiFetch("/skills/create/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newSkill }),
      });

      if (!res.ok) throw new Error("Create failed");

      setNewSkill("");
      setShowSkillModal(false);
      fetchSkills(); // 🔥 reload
    } catch (err) {
      console.error(err);
      alert("Tạo thất bại");
    }
  };


  const handleDeleteSkill = async (uuid) => {
    const confirmDelete = window.confirm("Xóa skill này?");
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("access");

      const res = await apiFetch(`/skills/delete/${uuid}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Delete failed");

      fetchSkills();
    } catch (err) {
      console.error(err);
      alert("Xóa thất bại");
    }
  };
  const fetchSkills = async () => {
    try {
      const token = localStorage.getItem("access");

      const res = await apiFetch("/skills/my-skills/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Fetch skills failed");

      const data = await res.json();
      setSkills(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("access");

      const res = await apiFetch("/accounts/me/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Fetch user thất bại");

      const data = await res.json();

      const avatarUrl = `http://127.0.0.1:8000${data.avatarpath.replace(/\\/g, "/")}`;

      const userData = { ...data, avatarpath: avatarUrl };

      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      setForm({
        fullname: data.fullname || "",
        email: data.email || "",
        phone: data.phone || "",
        user_code: data.user_code || "",
        address: data.address || "",
      });
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {


    fetchSkills();
    fetchProfile();
  }, []);


  const handleAvatarUpload = async () => {
    const token = localStorage.getItem("access");

    if (!avatarFile) {
      return alert("Chưa chọn ảnh");
    }

    const formData = new FormData();
    formData.append("avatarpath", avatarFile);

    try {
      const res = await fetch("http://127.0.0.1:8000/accounts/profile/avatar/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Upload error:", err);
        return alert("Upload thất bại");
      }

      const data = await res.json();

      setUser((prev) => ({
        ...prev,
        avatarpath: `http://127.0.0.1:8000${data.avatar}`,
      }));
      const updatedUser = {
        ...user,
        avatarpath: `http://127.0.0.1:8000${data.avatar}`,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      window.dispatchEvent(new Event("user-updated"));

      setAvatarModalOpen(false);
      setAvatarFile(null);
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi upload");
    }
  };
  // const handleAvatarUpload = async () => {
  //   const token = localStorage.getItem("access");

  //   if (!avatarFile) {
  //     return alert("Chưa chọn ảnh");
  //   }
  //   const formData = new FormData();
  //   formData.append("avatarpath", avatarFile);

  //   const res = await apiFetch("/accounts/profile/avatar/", {
  //     method: "POST",
  //     headers: {
  //       Authorization: `Bearer ${token}`,
  //     },
  //     body: formData,
  //   });

  //   if (!res.ok) return alert("Upload thất bại");

  //   const data = await res.json();

  //   setUser((prev) => ({
  //     ...prev,
  //     avatarpath: `http://127.0.0.1:8000${data.avatar}`,
  //   }));

  //   setAvatarModalOpen(false);
  // };

  const handleProfileUpdate = async () => {
    const token = localStorage.getItem("access");

    const res = await apiFetch("/accounts/profile/", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });

    if (!res.ok) return alert("Cập nhật thất bại");

    const data = await res.json();

    setUser((prev) => ({
      ...prev,
      ...data,
    }));

    setEditModalOpen(false);
    fetchProfile();
  };

  if (!user) return <div>Loading...</div>;

  const scorePercent = Math.min(user.reliability_score * 10, 100);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.avatarWrapper}>
          <img
            src={user.avatarpath}
            alt="avatar"
            className={styles.avatar}
          />
          <button
            className={styles.changeAvatarBtn}
            onClick={() => setAvatarModalOpen(true)}
          >
            Đổi avatar
          </button>
        </div>

        <div className={styles.info}>
          <h2 className={styles.username}>@{user.username}</h2>
          <p><span className={styles.text2}>- {user.user_code} -</span></p>
          <div className={styles.field}>
            <div className={styles.info_container}>
              <p><span className={styles.text}>Email:</span> <span className={styles.text2}>{user.email}</span></p>
              <p><span className={styles.text}>Họ tên:</span> <span className={styles.text2}>{user.fullname}</span></p>
              <p><span className={styles.text}>Địa chỉ:</span> <span className={styles.text2}>{user.address}</span></p>
              <p><span className={styles.text}>SĐT:</span> <span className={styles.text2}>{user.phone}</span></p>
            </div>
          </div>

          <div className={styles.scoreBox}>
            <div className={styles.scoreHeader}>
              <span className={styles.text}>Độ uy tín</span>
              <span>{user.reliability_score}/10</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${scorePercent}%` }}
              />
            </div>
          </div>
          <div className={styles.skillSection}>
            <h3 className={styles.skillTitle}>Kỹ năng</h3>

            <div className={styles.skillContainer}>
              {skills.map((skill) => (
                <div key={skill.uuid} className={styles.skillItem}>
                  <span>{skill.name}</span>

                  <button
                    className={styles.deleteSkillBtn}
                    onClick={() => handleDeleteSkill(skill.uuid)}
                  >
                    <FaDeleteLeft size={20} />
                  </button>
                </div>
              ))}

              {/* Nút thêm */}
              <button
                className={styles.addSkillBtn}
                onClick={() => setShowSkillModal(true)}
              >
                +
              </button>
            </div>
          </div>

          <div className={styles.buttonGroup}>
            <button
              className={styles.editBtn}
              onClick={() => setEditModalOpen(true)}
            >
              Chỉnh sửa hồ sơ
            </button>

            <button className={styles.logoutBtn} onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* ================= MODAL AVATAR ================= */}
      {isAvatarModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Đổi avatar</h3>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setAvatarFile(e.target.files[0]);
              }}
            />
            {avatarFile && (
              <p className={styles.fileName}>
                Đã chọn: {avatarFile.name}
              </p>
            )}

            <div className={styles.modalActions}>
              <button onClick={handleAvatarUpload}>Lưu</button>
              <button onClick={() => setAvatarModalOpen(false)}>Huỷ</button>
            </div>
          </div>
        </div>
      )}

      {showSkillModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Thêm skill</h3>

            <input
              placeholder="Tên skill"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
            />

            <div className={styles.modalActions}>
              <button onClick={handleCreateSkill}>Lưu</button>
              <button onClick={() => setShowSkillModal(false)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL EDIT PROFILE ================= */}
      {isEditModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Cập nhật thông tin</h3>

            <input
              placeholder="Fullname"
              value={form.fullname}
              onChange={(e) =>
                setForm({ ...form, fullname: e.target.value })
              }
            />

            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />

            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value })
              }
            />

            <input
              placeholder="User code"
              value={form.user_code}
              onChange={(e) =>
                setForm({ ...form, user_code: e.target.value })
              }
            />

            <input
              placeholder="Address"
              value={form.address}
              onChange={(e) =>
                setForm({ ...form, address: e.target.value })
              }
            />

            <div className={styles.modalActions}>
              <button onClick={handleProfileUpdate}>Lưu</button>
              <button onClick={() => setEditModalOpen(false)}>Huỷ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

