import { useState } from "react";
import styles from "./Modal.module.css";

export default function AvatarModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("avatarpath", file);

    const res = await fetch("/accounts/profile/avatar/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access")}`
      },
      body: formData
    });

    const data = await res.json();

    onSuccess(`http://127.0.0.1:8000${data.avatar}`);
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>Update Avatar</h2>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
        />

        {/* PLACEHOLDER: crop UI */}
        {file && <p>Preview ready (crop UI có thể thêm sau)</p>}

        <div className={styles.actions}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleUpload}>Upload</button>
        </div>
      </div>
    </div>
  );
}