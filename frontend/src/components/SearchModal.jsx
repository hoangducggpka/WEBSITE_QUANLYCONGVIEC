import { useSearchModal } from "../context/SearchModalContext";
import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";
import styles from "./SearchModal.module.css";

function SearchModal() {
  const { open, setOpen } = useSearchModal();
  const [keyword, setKeyword] = useState("");
  const [groups, setGroups] = useState([]);

  // debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!keyword) return;
      apiFetch("/groups/search/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keyword }),
      })
        .then(res => res.json())
        .then(data => setGroups(data));
    }, 300);

    return () => clearTimeout(timeout);
  }, [keyword]);

  function requestJoinGroup(groupUuid) {
    return apiFetch(`/request/${groupUuid}/create/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }).then(res => {
      if (!res.ok) {
        return res.json().then(err => {
          throw err;
        });
      }
      return res.json();
    });
  }


  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={() => setOpen(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        
        <input
          autoFocus
          placeholder="Tìm nhóm..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        <div className={styles.list}>
          {groups.map((g) => (
            <div key={g.uuid} className={styles.item}>
              <div>
                <h4>{g.name}</h4>
                <p>{g.member_count} thành viên</p>
              </div>

              <button onClick={() => {
                requestJoinGroup(g.uuid)
                  .then(data => {
                    alert("Đã yêu cầu:", data);
                  })
                  .catch(err => {
                    alert("Lỗi:", err);
                  });
              }}>
                Yêu cầu tham gia
              </button>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default SearchModal;