import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./GroupDetail.module.css";
import { apiFetch } from "../utils/api";
import { IoReturnDownBackSharp } from "react-icons/io5";

const BASE_URL = "http://127.0.0.1:8000";

const GroupDetail = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();

  const [leader, setLeader] = useState(null);
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [username, setUsername] = useState("");

  const [groupInfo, setGroupInfo] = useState(null);
  const token = localStorage.getItem("access");

  const [requests, setRequests] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const fetchRequests = async (group_uuid) => {
    try {
      const res = await apiFetch(`/request/${group_uuid}/leader/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setRequests(data);
      } else {
        console.error("Fetch requests failed", data);
      }
    } catch (err) {
      console.error("Fetch request error:", err);
    }
  };


  const FetchMembers = async (uuid) => {
    apiFetch(`/groups/${uuid}/members_groupdetail/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setGroupInfo(data.group);
        setLeader(data.leader);
        setMembers(data.members);
      })
      .catch((err) => console.error(err));
  }
  // Fetch members
  useEffect(() => {
    FetchMembers(uuid);
    fetchRequests(uuid);
  }, [uuid]);

  const handleApprove = async (request_uuid) => {
    if (!window.confirm("Bạn có chắc chắn muốn duyệt yêu cầu này?")) {
      return;
    }
    try {
      const res = await apiFetch(
        `/request/approve/${request_uuid}/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (res.ok) {
        alert("Duyệt thành công");
        fetchRequests(uuid);
        FetchMembers(uuid); 

      } else {
        alert(data.error || "Duyệt thất bại");
      }
    } catch (err) {
      alert("Network error: " + err.message);
    }
  };

  function handleReject(requestUuid) {
    if (!window.confirm("Bạn có chắc chắn muốn từ chối yêu cầu này?")) {
      return;
    }

    apiFetch(`/request/reject/${requestUuid}/`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw err; });
        }
        return res.json();
      })
      .then(data => {
        console.log("Đã từ chối yêu cầu", data);
        // cập nhật lại danh sách requests sau khi reject
        setRequests(prev => prev.filter(r => r.uuid !== requestUuid));
        fetchRequests(uuid);

      })
      .catch(err => {
        console.error("Error:", err);
        alert("Có lỗi xảy ra khi từ chối yêu cầu.");
      });
    

  }


  const filteredMembers = useMemo(() => {
    return members.filter((member) =>
      member.fullname
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [members, searchTerm]);

  // Add member
  const handleAddMember = async () => {
    const res = await apiFetch(
      `/groups/${uuid}/add_member/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username }),
      }
    );
    const data = await res.json();

    if (res.ok) {
      setShowAddModal(false);
      setUsername("");
      // refetch
      const data = await apiFetch(
        `/groups/${uuid}/members_groupdetail/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      ).then((r) => r.json());

      setMembers(data.members);
    } else {
      alert(data.error);
    }
  };

  // Kick member
  const handleKick = async (user_id) => {
    const confirmKick = window.confirm("Bạn có chắc chắn muốn kick thành viên này?");
    if (!confirmKick) return;
    try {
      const res = await apiFetch(
        `/groups/${uuid}/kick/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ user_id }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.user_id !== user_id));
      } else {
        alert(data.error || "Có lỗi xảy ra khi kick thành viên");
      }
    } catch (err) {
      alert("Network error: " + err.message);
    }
  };


  return (
    <div className={styles.container}>
      <button
        className={styles.backButton}
        onClick={() => navigate("/group")}
      >
        <IoReturnDownBackSharp />
      </button>

      {groupInfo && (
            <div className={styles.groupHeader}>
                <h1>{groupInfo.group_name}</h1>
                {/* <span>ID: {groupInfo.uuid}</span> */}
            </div>
            )}
      {/* Leader */}
      {leader && (
        <div className={styles.leaderCard}>
          <img
            src={`${leader.avatarpath}`}
            alt="leader"
          />
          <div className={styles.infor_leader}>
            <h2 className={styles.fullname}>{leader.fullname}</h2>
            <h2 className={styles.username}>(@{leader.username})</h2>
            <span>Leader</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <input
          type="text"
          placeholder="Tìm thành viên..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {groupInfo?.is_leader && (
          <>
            <button
              className={styles.addBtn}
              onClick={() => setShowAddModal(true)}
            >
              + Thêm thành viên
            </button>

            <button
              className={styles.requestBtn}
              onClick={() => setShowRequestModal(true)}
            >
              Yêu cầu tham gia
              {requests && requests.length > 0 && (
                <span className={styles.badge}>{requests.length}</span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Member List */}
      <div className={styles.memberList}>
        {filteredMembers.map((member) => (
          <div key={member.user_id} className={styles.memberCard}>
            <img
              src={`${member.avatarpath}`}
              alt="avatar"
            />

            <div className={styles.info}>
              <h3>{member.fullname}<span>({member.username})</span></h3>
              <p><span>Mã:</span> {member.user_code || "No Code"}</p>
              <p><span>Email:</span> {member.email}</p>
            </div>

            {groupInfo?.is_leader && (
              <>
                <button
                className={styles.kickBtn}
                onClick={() => handleKick(member.user_id)}
                >
                Xóa
              </button>
            </>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Add Member</h3>

            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <div className={styles.modalActions}>
              <button onClick={handleAddMember}>Thêm</button>
              <button onClick={() => setShowAddModal(false)}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
      {showRequestModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Danh sách yêu cầu</h3>

            {requests.length === 0 ? (
              <p>Không có yêu cầu nào</p>
            ) : (
              <div className={styles.requestList}>
                {requests.map((req) => (
                  <div key={req.uuid} className={styles.requestItem}>
                    <img
                      src={`${req.avatarpath}`}
                      alt="avatar"
                    />

                    <div className={styles.info}>
                      <h4>{req.fullname}</h4>
                      <p>{req.user_code}</p>
                    </div>

                    <div className={styles.actions}>
                      <button
                        className={styles.approveBtn}
                        onClick={() => handleApprove(req.uuid)}
                      >
                        Duyệt
                      </button>

                      <button
                        className={styles.rejectBtn}
                        onClick={() => handleReject(req.uuid)}
                      >
                        Từ chối
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button className={styles.closeBtn} onClick={() => setShowRequestModal(false)}>
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetail;