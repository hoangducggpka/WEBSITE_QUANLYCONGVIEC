import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./ProjectDetail.module.css";
import { apiFetch } from "../utils/api";
import { IoReturnDownBackSharp } from "react-icons/io5";
import { FiEdit } from "react-icons/fi";

import { FaCommentAlt } from "react-icons/fa";

const BASE_URL = "http://127.0.0.1:8000";

const STATUS_MAP = {
  todo: "Phải làm",
  inprogress: "Đang làm",
  stuck: "Gặp trục trặc", 
  done: "Hoàn thành",
  overdue: "Quá hạn"
};

function renderNote(note) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return note.split(urlRegex).map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>
    ) : (
      part
    )
  );
}


function ProjectDetail() {

  const { uuid } = useParams();
  const navigate = useNavigate();

  const [project,setProject] = useState(null);

  const [selectedTasks,setSelectedTasks] = useState([]);

  const [memberModal,setMemberModal] = useState(false);
  const [taskModal,setTaskModal] = useState(false);

  const [taskName,setTaskName] = useState("");
  const [taskStart,setTaskStart] = useState("");
  const [taskEnd,setTaskEnd] = useState("");
  const [difficulty,setDifficulty] = useState(1);
  const [activeStatus, setActiveStatus] = useState("todo");

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);


  const [selectedMembers,setSelectedMembers] = useState([]);

  const [showNameModal, setShowNameModal] = useState(false);
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");


  const [updateModal, setUpdateModal] = useState(false);
  const [updateName, setUpdateName] = useState("");
  const [updateStart, setUpdateStart] = useState("");
  const [updateEnd, setUpdateEnd] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCloseComment();
    }
  };

  const handleCloseComment = () => {
    setIsClosing(true);

    setTimeout(() => {
      setShowCommentModal(false);
      setIsClosing(false);
    }, 100);
  };

  const allSkills = useMemo(() => {
    if (!project) return [];

    const map = new Map();

    project.group_members.forEach(m => {
      m.skills.forEach(s => {
        map.set(s.uuid, s);
      });
    });

    return Array.from(map.values());
  }, [project]);
  const toggleSkill = (skillUuid) => {
    setSelectedSkills(prev =>
      prev.includes(skillUuid)
        ? prev.filter(s => s !== skillUuid)
        : [...prev, skillUuid]
    );
  };
  const sortedMembersNotInProject = useMemo(() => {
    if (!project) return [];

    const ids = new Set(project.project_members.map(m => m.user_id));

    const members = project.group_members.filter(
      m => !ids.has(m.user_id)
    );

    if (selectedSkills.length === 0) return members;

    return [...members].sort((a, b) => {
      const scoreA = a.skills.filter(s => selectedSkills.includes(s.uuid)).length;
      const scoreB = b.skills.filter(s => selectedSkills.includes(s.uuid)).length;

      return scoreB - scoreA;
    });

  }, [project, selectedSkills]);

  const toLocalInputValue = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const pad = (n) => n.toString().padStart(2, "0");
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };



  const openUpdateModal = () => {
    if (selectedTasks.length !== 1) {
      alert("Chỉ chọn 1 công việc để chỉnh sửa!");
      return;
    }

    const task = project.tasks.find(t => t.uuid === selectedTasks[0]);

    setUpdateName(task.name);
    setUpdateStart(task.start_date || "");
    setUpdateEnd(task.end_date || "");

    setUpdateModal(true);
  };

  const updateTask = async () => {
    const access = localStorage.getItem("access");

    const taskUuid = selectedTasks[0];

    try {
      const res = await apiFetch(
        `/tasks/${taskUuid}/update_task/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access}`
          },
          body: JSON.stringify({
            name: updateName,
            start_date: updateStart,
            end_date: updateEnd
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Cập nhật thất bại!");
        return;
      }

      alert(data.message || "Cập nhật thành công!");

      setUpdateModal(false);
      setSelectedTasks([]);

      await fetchProject();

    } catch (err) {
      console.error(err);
      alert("Lỗi server!");
    }
  };

  const handleDeleteTasks = async () => {
    if (selectedTasks.length === 0) return;

    const confirmDelete = window.confirm(
      `Bạn có chắc muốn xóa ${selectedTasks.length} công việc không?`
    );

    if (!confirmDelete) return;

    try {
      const access = localStorage.getItem("access");

      const res = await apiFetch(
        `/tasks/bulk-delete/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access}`,
          },
          body: JSON.stringify({
            task_uuids: selectedTasks,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Xóa thất bại!");
        return;
      }
      // reset selection
      setSelectedTasks([]);

      // reload project
      await fetchProject();
      alert(data.message || "Đã xóa!");
    } catch (err) {
      console.error(err);
      alert("Lỗi server!");
    }
  };
  const normalizePath = (path)=>{
    if(!path) return null;
    return `${path.replace(/\\/g,"/")}`;
  }

  useEffect(() => {
    setSelectedTasks([]);
    const interval = setInterval(fetchProject, 30000);
    return () => clearInterval(interval);
    
  }, [activeStatus]);

  const fetchProject = async()=>{

    const access = localStorage.getItem("access");

    const res = await apiFetch(
      `/projects/${uuid}/detail/`,
      {
        headers:{Authorization:`Bearer ${access}`}
      }
    );

    const data = await res.json();

    data.group_members = data.group_members.map(m=>({
      ...m,
      avatar:m.avatarpath
    }));

    data.project_members = data.project_members.map(m=>({
      ...m,
      avatar:m.avatarpath
    }));

    data.tasks = data.tasks.map(t=>({
      ...t,
      avatar:t.avatarpath
    }));

    setProject(data);

}

  useEffect(()=>{



    fetchProject();
    const interval = setInterval(fetchProject, 60000);
    return () => clearInterval(interval);

  },[uuid])



  const difficultyLabel = (d)=>{

    switch(d){

      case 1:return {label:"Dễ",class:styles.easy}
      case 2:return {label:"Trung Bình",class:styles.medium}
      case 3:return {label:"Khó",class:styles.hard}
      case 4:return {label:"Cực Khó",class:styles.extreme}

      default:return {label:"Không rõ",class:""}

    }

  }



  const tasksByStatus = useMemo(()=>{

    const grouped={
      todo:[],
      inprogress:[],
      stuck:[],
      done:[],
      overdue:[],
    }

    if(!project?.tasks) return grouped

    project.tasks.forEach(task=>{
      if(grouped[task.status]){
        grouped[task.status].push(task)
      }
    })

    return grouped

  },[project])

  const currentTasks = tasksByStatus[activeStatus];



  const membersNotInProject = useMemo(()=>{

    if(!project) return []

    const ids=new Set(
      project.project_members.map(m=>m.user_id)
    )

    return project.group_members.filter(
      m=>!ids.has(m.user_id)
    )

  },[project])



  const toggleTask=(id)=>{

    setSelectedTasks(prev => {
      const newTasks = prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id];
      console.log(newTasks); // log giá trị mới
      return newTasks;
    });

  }



  const toggleStatusTasks = (status) => {

    const ids = tasksByStatus[status].map(t => t.uuid)

    if (ids.length === 0) return

    setSelectedTasks(prev => {

      const allSelected = ids.every(id => prev.includes(id))

      if (allSelected) {
        // bỏ chọn tất cả
        return prev.filter(id => !ids.includes(id))
      }

      // chọn tất cả
      return [...new Set([...prev, ...ids])]

    })

  }

  const addMember=async(userprofile_uuid)=>{

    const access=localStorage.getItem("access")

    const res=await apiFetch(
      `/projects/${project.uuid}/members/`,
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          Authorization:`Bearer ${access}`
        },
        body:JSON.stringify({
          user_uuid:userprofile_uuid
        })
      }
    )

    const data=await res.json()

    alert(data.message||"Đã thêm")
    fetchProject();
  
  }

  const kickMember = async (userproject_uuid) => {
    const confirmDelete = window.confirm("Xóa người dùng này sẽ khiến các công việc đã giao bị xóa đi?");
    if (!confirmDelete) return;
    const access = localStorage.getItem("access");

    try {
      const res = await apiFetch(
        `/projects/members/${userproject_uuid}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${access}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Xóa thất bại");
      }

      // alert(data.message || "Đã xóa thành viên!");
      fetchProject();

    } catch (err) {
      alert(err.message || "Có lỗi xảy ra!");
    }
  };


  const toggleMember=(uuid)=>{

    setSelectedMembers(prev=>
      prev.includes(uuid)
      ?prev.filter(x=>x!==uuid)
      :[...prev,uuid]
    )

  }



  const toggleAllMembers=()=>{

    if(selectedMembers.length===project.project_members.length){
      setSelectedMembers([])
    }
    else{
      setSelectedMembers(
        project.project_members.map(m=>m.userproject_uuid)
      )
    }

  }


  const parseDRFErrors = (errors) => {
    let messages = []

    if (Array.isArray(errors)) {
      errors.forEach(err => {
        messages = messages.concat(parseDRFErrors(err))
      })
    } 
    else if (typeof errors === "object" && errors !== null) {
      Object.values(errors).forEach(val => {
        messages = messages.concat(parseDRFErrors(val))
      })
    } 
    else if (typeof errors === "string") {
      messages.push(errors)
    }

    return messages
  }
  const validateTaskForm = () => {
    const errors = [];

    if (!taskName || taskName.trim() === "") {
      errors.push("Tên công việc không được để trống");
    } else if (taskName.length > 225) {
      errors.push("Tên công việc không quá 225 ký tự");
    }

    if (!taskStart) {
      errors.push("Vui lòng chọn ngày bắt đầu");
    }

    if (!taskEnd) {
      errors.push("Vui lòng chọn ngày kết thúc");
    }

    if (taskStart && taskEnd) {
      const start = new Date(taskStart);
      const end = new Date(taskEnd);

      if (start >= end) {
        errors.push("Ngày kết thúc phải sau ngày bắt đầu");
      }
    }

    if (!difficulty) {
      errors.push("Vui lòng chọn độ khó");
    }

    if (!selectedMembers || selectedMembers.length === 0) {
      errors.push("Phải chọn ít nhất 1 thành viên");
    }

    return errors;
  };

  const createTasks = async () => {
    const formErrors = validateTaskForm();

    if (formErrors.length > 0) {
      alert(formErrors.join("\n"));
      return;
    }

    const access = localStorage.getItem("access");

    const payload = {
      tasks: selectedMembers.map(m => ({
        name: taskName,
        start_date: new Date(taskStart).toISOString(),
        end_date: new Date(taskEnd).toISOString(),
        assigned_to: m,
        difficulty: difficulty
      }))
    };

    try {
      const res = await apiFetch(
        `/tasks/${project.uuid}/bulk-create/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access}`
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await res.json();

      if (!res.ok) {
        const errors = parseDRFErrors(data);
        alert(errors.join("\n"));
        return;
      }

      alert("Tạo task thành công");
      setTaskModal(false);
      fetchProject();

    } catch (err) {
      alert(err.message);
    }
  };

  function updateProjectName(projectUuid) {
    apiFetch(`/projects/update-name/${projectUuid}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    })
      .then(res => {
        if (!res.ok) return res.json().then(err => { throw err; });
        return res.json();
      })
      .then(data => {
        alert("Đã thay đổi tên dự án!", data);
        setShowNameModal(false);
        fetchProject();
        // cập nhật lại project state nếu cần
      })
      .catch(err => alert("Có lỗi khi đổi tên dự án"));
  }

  function updateProjectDates(projectUuid) {
    apiFetch(`/projects/update-dates/${projectUuid}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      }),
    })
      .then(async (res) => {
        let data;

        try {
          data = await res.json();
        } catch {
          data = null;
        }

        if (!res.ok) {
          throw data || { error: "Server error" };
        }

        return data;
      })
      .then((data) => {
        alert("Đã đổi thời gian dự án");
        setShowDatesModal(false);
        fetchProject();
      })
      .catch((err) => {
        console.error("Error:", err);

        const message =
          err?.error ||
          err?.detail ||
          err?.message ||
          "Có lỗi khi đổi thời gian dự án";

        alert(message);
      });
  }




  if(!project) return <div>Loading...</div>



  return (
  <div className={styles.page}>

    {/* Nút quay lại */}
    <button className={styles.backButton} onClick={() => navigate("/projects")}>
      <IoReturnDownBackSharp />
    </button>

    {/* HEADER */}
    <div className={styles.header}>
      <div>
        <div className={styles.project_name_container}>
          <h1 className={styles.title}>{project.name}</h1>
          <button className={styles.editButton} onClick={() => setShowNameModal(true)}><FiEdit /></button>
        </div>
        <div className={`${styles.time} ${styles.groupname}`}>Nhóm : <span>{project.group_name}</span></div>
        <div className={styles.time_container}>
          <div className={styles.time}>
            {project.project_time_range}
          </div>
          <button className={styles.editButton} onClick={() => setShowDatesModal(true)}><FiEdit /></button>
        </div>
      </div>

      <div className={styles.members}>
        {project.project_members.slice(0,4).map(m => (
          <img key={m.user_id} src={m.avatar} className={styles.avatar}/>
        ))}
        {project.project_members.length > 4 && (
          <div className={styles.moreMembers}>+{project.project_members.length - 4}</div>
        )}
        {project.is_creator && (
          <button className={styles.manageBtn} onClick={() => setMemberModal(true)}>
            Quản lý
          </button>
        )}
      </div>
    </div>

    {/* TOOLBAR */}
    <div className={styles.toolbar}>
      <input type="text" placeholder="Tìm kiếm..." className={styles.search}/>
      {project.is_creator && (
        <button className={styles.createBtn} onClick={() => setTaskModal(true)}>
          + Tạo công việc
        </button>
      )}

      {selectedTasks.length > 0 && (
        <>
          <button className={styles.actionBtn}>Đánh giá</button>
              <button 
                className={styles.actionBtn}
                onClick={openUpdateModal}
              >
                Chỉnh sửa
              </button>
          <button className={styles.actionBtn} onClick={handleDeleteTasks}>Xóa ({selectedTasks.length})</button>
        </>
      )}
    </div>

    {/* TASK SECTIONS */}
    <div className={styles.tabs}>
      {Object.keys(STATUS_MAP).map(status => (
        <button
          key={status}
          className={`${styles.tab} ${activeStatus === status ? styles.activeTab : ""}`}
          onClick={() => setActiveStatus(status)}
        >
          {STATUS_MAP[status]}
          <span className={styles.count}>
            {tasksByStatus[status].length}
          </span>
        </button>
      ))}
    </div>
    <div className={styles.section}>

      {/* <div className={styles.sectionHeader}>
        {STATUS_MAP[activeStatus]}
        <span className={styles.count}>
          {currentTasks.length}
        </span>
      </div> */}

      <div className={styles.tableWrapper}>

        <div className={styles.tableHeader}>
          <div>
            <input
              type="checkbox"
              checked={
                currentTasks.length > 0 &&
                currentTasks.every(t => selectedTasks.includes(t.uuid))
              }
              onChange={() => toggleStatusTasks(activeStatus)}
            />
          </div>

          <div className={styles.label}>TÊN CÔNG VIỆC</div>
          <div className={styles.label}>GHI CHÚ</div>
          <div className={styles.label}>THỜI GIAN</div>
          <div className={styles.label}>NGƯỜI THỰC HIỆN</div>
          <div className={styles.label}>ĐỘ KHÓ</div>
        </div>

        <div className={styles.tableBody}>
          {currentTasks.length === 0 && (
              <div style={{ padding: "20px", opacity: 0.6 }}>
                Không có công việc nào
              </div>
            )}
          {currentTasks.map(task => {
            const diff = difficultyLabel(task.difficulty);

            return (
              <div key={task.uuid} className={styles.row}>
                <input
                  type="checkbox"
                  checked={selectedTasks.includes(task.uuid)}
                  onChange={() => toggleTask(task.uuid)}
                />

                <div className={styles.text}>{task.name}</div>
                <div className={styles.text}>{task.note ? renderNote(task.note) : "Không có"}</div>
                <div className={styles.text}>{task.time_range}</div>

                <div className={styles.avatarWrapper}>
                  <img src={task.avatar} className={styles.avatarSmall}/>
                  <span className={styles.tooltip}>{task.fullname}</span>
                </div>

                <div className={`${styles.badge} ${diff.class}`}>
                  {diff.label}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>

    {memberModal && (
      <div className={`${styles.modalOverlay} ${styles.memberModal}`}>
        <div className={`${styles.modal} ${styles.memberModalLayout}`}>
          {/* <h2>Quản lý thành viên</h2> */}
          <div className={styles.leftColumn}>
            <p>Các kỹ năng sẵn có ({allSkills.length})</p>
            {/* SKILL FILTER */}
            <div className={`${styles.skillFilter} ${styles.skillContainer}`}>
              {allSkills.map(skill => (
                <button
                  key={skill.uuid}
                  className={`${styles.skillBtn} ${
                    selectedSkills.includes(skill.uuid) ? styles.activeSkill : ""
                  }`}
                  onClick={() => toggleSkill(skill.uuid)}
                >
                  {skill.name}
                </button>
              ))}
            </div>

            {/* SELECTED SKILLS */}
            {/* <div className={styles.selectedSkills}>
              {selectedSkills.map(skillId => {
                const skill = allSkills.find(s => s.uuid === skillId);
                return (
                  <span
                    key={skillId}
                    className={styles.selectedSkill}
                    onClick={() => toggleSkill(skillId)}
                  >
                    {skill.name} ✕
                  </span>
                );
              })}
            </div> */}
          </div>

          {/* CHƯA THAM GIA */}
          <div className={styles.rightColumn}>
            <div>
              <h3>Chưa tham gia ({sortedMembersNotInProject.length})</h3>
              <div className={styles.notJoinedContainer}>
                {sortedMembersNotInProject.map(m => (
                  <div key={m.user_id} className={styles.memberCard}>
                    <div className={styles.memberInfo}>
                      <img src={m.avatar} className={styles.avatarSmall}/>
                      <div>
                        <div className={styles.memberName}>{m.fullname}</div>
                        <div className={`${styles.code} ${styles.member_code}`}>-{m.useruser_code}-</div>
                      </div>
                    </div>

                    {/* SKILLS */}
                    <div className={styles.skillList}>
                      {m.skills.length > 0 ? (
                        m.skills.map(s => (
                          <span key={s.uuid} className={styles.skillTag}>
                            {s.name}
                          </span>
                        ))
                      ) : (
                        <span className={styles.noSkill}>Không có skill</span>
                      )}
                    </div>
                    <div className={styles.button_container}>
                      <button  className={styles.primary} onClick={() => addMember(m.userprofile_uuid)}>
                        Thêm
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>


            {/* ĐÃ THAM GIA */}
            <div>
              <h3>Đã tham gia ({project.project_members.length})</h3>
              <div className={styles.joinedContainer}>
                {project.project_members.map(m => (
                  <div key={m.user_id} className={styles.memberRow}>
                    <img src={m.avatar} className={styles.avatarSmall}/>
                    <span>{m.fullname}</span>
                    <span>{m.user_code}</span>
                    <button className={styles.secondary} onClick={() => kickMember(m.userproject_uuid)}>
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button className={styles.secondary} onClick={() => setMemberModal(false)}>Đóng</button>
        </div>
      </div>
    )}

    {/* TASK MODAL */}
    {taskModal && (
      <div className={`${styles.modalOverlay} ${styles.taskModal}`}>
        <div className={`${styles.modal} ${styles.taskModalLayout}`}>
          <h2>Tạo công việc</h2>

          <div className={styles.field_container}>
            <label className={styles.label2}>Tên công việc:</label>
            <input type="text" placeholder="Tên công việc(không quá 225 ký tự)" value={taskName} onChange={e => setTaskName(e.target.value)}/>
          </div>
          <div className={styles.field_container}>
            <label className={styles.label2}>Ngày bắt đầu:</label>
            <input type="datetime-local" value={toLocalInputValue(taskStart)} onChange={e => setTaskStart(e.target.value)}/>
          </div>
          <div className={styles.field_container}>
            <label className={styles.label2}>Ngày kết thúc:</label>
            <input type="datetime-local" value={toLocalInputValue(taskEnd)} onChange={e => setTaskEnd(e.target.value)}/>
          </div>
          <div className={styles.field_container}>
            <label className={styles.label2}>Chọn độ khó:</label>
            <select value={difficulty} onChange={e => setDifficulty(Number(e.target.value))}>
              <option value={1}>Dễ</option>
              <option value={2}>Trung Bình</option>
              <option value={3}>Khó</option>
              <option value={4}>Cực Khó</option>
            </select>
          </div>

          <h3>Thành viên</h3>
          <label className={styles.label2}>
            <input type="checkbox" onChange={toggleAllMembers}/> Chọn tất cả
          </label>
          <div className={styles.memberListContainer}>
            {project.project_members.map(m => (
              <div key={m.userproject_uuid} className={styles.memberRow}>
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(m.userproject_uuid)}
                  onChange={() => toggleMember(m.userproject_uuid)}
                />

                <img src={m.avatar} className={styles.avatarSmall}/>

                <div className={styles.memberInfoCol}>
                  <span className={styles.memberName}>{m.fullname} - {m.user_code}</span>

                  <div className={styles.skillList}>
                    {m.skills && m.skills.length > 0 ? (
                      m.skills.map(s => (
                        <span key={s.uuid} className={styles.skillTag}>
                          {s.name}
                        </span>
                      ))
                    ) : (
                      <span className={styles.noSkill}>Không có skill</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* {project.project_members.map(m => (
            <div key={m.userproject_uuid} className={styles.memberRow}>
              <input
                type="checkbox"
                checked={selectedMembers.includes(m.userproject_uuid)}
                onChange={() => toggleMember(m.userproject_uuid)}
              />
              <img src={m.avatar} className={styles.avatarSmall}/>
              <span>{m.fullname}</span>
            </div>
          ))} */}

          <button className={styles.primary} onClick={createTasks}>Tạo</button>
          <button className={styles.secondary} onClick={() => setTaskModal(false)}>Hủy</button>
        </div>
      </div>
    )}
    {/* modal đổi tên */}
    {showNameModal && (
      <div className={`${styles.modalOverlay} ${styles.nameModal}`}>
        <div className={styles.modal}>
          <div className={styles.field_container}>
            <h3>Đổi tên dự án</h3>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Tên mới"
              />
          </div>
          <button className={styles.primary} onClick={() => updateProjectName(project.uuid)}>Lưu</button>
          <button className={styles.secondary} onClick={() => setShowNameModal(false)}>Hủy</button>
        </div>
      </div>
    )}

    {/* modal đổi thời gian */}
    {showDatesModal && (
      <div className={`${styles.modalOverlay} ${styles.datesModal}`}>
        <div className={styles.modal}>
          <h3>Chỉnh sửa thời gian dự án</h3>

          <div className={styles.field_container}>
            <label className={styles.label2}>Bắt đầu:</label>
            <input
              type="datetime-local"
              value={toLocalInputValue(startDate)}
              onChange={e => setStartDate(e.target.value)}
              />
          </div>

          <div className={styles.field_container}>
            <label className={styles.label2}>Kết thúc:</label>
            <input
              type="datetime-local"
              value={toLocalInputValue(endDate)}
              onChange={e => setEndDate(e.target.value)}
              />
            </div>

            <button className={styles.primary} onClick={() => updateProjectDates(project.uuid)}>Lưu</button>
            <button className={styles.secondary} onClick={() => setShowDatesModal(false)}>Hủy</button>
        </div>
      </div>
    )}

    {updateModal && (
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <h2>Chỉnh sửa công việc</h2>

          <input
            type="text"
            value={updateName}
            onChange={e => setUpdateName(e.target.value)}
            placeholder="Tên công việc"
          />

          <label>Bắt đầu:</label>
          <input
            type="datetime-local"
            value={toLocalInputValue(updateStart)}
            onChange={e => setUpdateStart(e.target.value)}
          />

          <label>Kết thúc:</label>
          <input
            type="datetime-local"
            value={toLocalInputValue(updateEnd)}
            onChange={e => setUpdateEnd(e.target.value)}
          />

          <div className={styles.actions}>
            <button className={styles.primary} onClick={updateTask}>Lưu</button>
            <button className={styles.secondary} onClick={() => setUpdateModal(false)}>Hủy</button>
          </div>
        </div>
      </div>
    )}
    {showCommentModal && (
      <div className={styles.commentOverlay} onClick={handleOverlayClick} >
        <div
          className={`${styles.commentModal} ${
            isClosing ? styles.slideOut : styles.slideIn
          }`}
        >
          <div className={styles.commentHeader}>
            <h3>Comment</h3>
            <button onClick={handleCloseComment}>✕</button>
          </div>

          <div className={styles.commentBody}>
            <p style={{ opacity: 0.6 }}>Chưa có nội dung...</p>
          </div>

          <div className={styles.commentInput}>
            <input type="text" placeholder="Nhập comment..." />
            <button>Gửi</button>
          </div>
        </div>
      </div>
    )}

    {/* <button
      className={`${styles.floatingBtn} ${
        unreadCount > 0 ? styles.hasNotify : ""
      }`}
      onClick={() => {
        setShowCommentModal(true);
        setUnreadCount(0);
      }}
    >
      <FaCommentAlt />

      {unreadCount > 0 && (
        <span className={styles.badge2}>
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button> */}
  </div>
);

}

export default ProjectDetail
