import { useState } from "react";
import styles from "./Modal.module.css";

export default function EditProfileModal({ user, onClose, onSuccess }) {
  const [form, setForm] = useState({
    fullname: user.fullname,
    address: user.address,
    phone: user.phone,
    email: user.email,
    user_code: user.user_code
  });

  const handleSubmit = async () => {
    const res = await fetch("/accounts/profile/", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access")}`
      },
      body: JSON.stringify(form)
    });

    const data = await res.json();
    onSuccess(data);
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>Edit Profile</h2>

        <input value={form.fullname}
          onChange={e => setForm({ ...form, fullname: e.target.value })} />

        <input value={form.address}
          onChange={e => setForm({ ...form, address: e.target.value })} />

        <input value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })} />

        <input value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })} />

        <input value={form.user_code}
          onChange={e => setForm({ ...form, user_code: e.target.value })} />

        <div className={styles.actions}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSubmit}>Save</button>
        </div>
      </div>
    </div>
  );
}