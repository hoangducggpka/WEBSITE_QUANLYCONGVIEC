import styles from "./Overview.module.css";

import { motion } from "framer-motion";
import { useState } from "react";

import {
  TbFolderCheck,
  TbFolderBolt,
  TbFolderPlus,
} from "react-icons/tb";

import {
  TfiLayoutGrid3Alt,
} from "react-icons/tfi";

import {
  FaArrowTrendUp,
  FaChevronRight,
  FaPaperPlane,
} from "react-icons/fa6";

import {
  SlOptionsVertical,
} from "react-icons/sl";

import {
  FiPaperclip,
} from "react-icons/fi";

function Overview() {

  const [message, setMessage] = useState("");

  const stats = [
    {
      title: "Tổng dự án",
      value: "24",
      desc: "Đang quản lý",
      icon: <TfiLayoutGrid3Alt />,
    },
    {
      title: "Tổng công việc",
      value: "186",
      desc: "Tasks đã tạo",
      icon: <TbFolderPlus />,
    },
    {
      title: "Đang thực hiện",
      value: "42",
      desc: "Tasks active",
      icon: <TbFolderBolt />,
    },
    {
      title: "Hoàn thành",
      value: "128",
      desc: "Tasks completed",
      icon: <TbFolderCheck />,
    },
  ];

  const projects = [
    {
      id: 1,
      name: "Workspace Management",
      status: "In Progress",
      progress: 78,
      tasks: 24,
      completed: 18,
      due: "2 ngày còn lại",
      risk: "High",
    },
    {
      id: 2,
      name: "AI Meeting Assistant",
      status: "Waiting Review",
      progress: 92,
      tasks: 14,
      completed: 13,
      due: "Hôm nay",
      risk: "Medium",
    },
    {
      id: 3,
      name: "Realtime Chat System",
      status: "Delayed",
      progress: 48,
      tasks: 31,
      completed: 11,
      due: "Quá hạn",
      risk: "Critical",
    },
  ];

  const tasks = [
    {
      id: 1,
      name: "Design Dashboard UI",
      project: "Workspace",
      progress: 82,
      priority: "High",
      due: "Today",
    },
    {
      id: 2,
      name: "Setup websocket",
      project: "Realtime Chat",
      progress: 56,
      priority: "Medium",
      due: "Tomorrow",
    },
    {
      id: 3,
      name: "Optimize API",
      project: "AI Assistant",
      progress: 23,
      priority: "Low",
      due: "3 days",
    },
    {
      id: 4,
      name: "Deploy beta version",
      project: "Workspace",
      progress: 91,
      priority: "High",
      due: "Today",
    },
  ];

  return (
    <div className={styles.page}>

      <div className={styles.left_container}>

        <div className={styles.stats_grid}>
          {stats.map((item, index) => (
            <motion.div
              key={index}
              className={styles.stat_card}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <div className={styles.stat_top}>
                <div className={styles.stat_icon}>
                  {item.icon}
                </div>

                <div className={styles.stat_trend}>
                  <FaArrowTrendUp />
                </div>
              </div>

              <div className={styles.stat_content}>
                <h4>{item.title}</h4>
                <h1>{item.value}</h1>
                <p>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className={styles.projects_section}>

          <div className={styles.section_header}>
            <div>
              <h3>Dự án gần đây</h3>
              <p>Workspace monitoring</p>
            </div>

            <button>
              Tất cả
            </button>
          </div>

          <div className={styles.projects_list}>

            {projects.map((item, index) => (
              <motion.div
                key={item.id}
                className={styles.project_card}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration:0.2 }}
              >

                <div className={styles.project_top}>

                  <div>
                    <h4>{item.name}</h4>
                    <p>{item.status}</p>
                  </div>

                  <button className={styles.project_button}>
                    <FaChevronRight />
                  </button>

                </div>

                <div className={styles.project_progress_container}>
                  <div
                    className={styles.project_progress}
                    style={{
                      width: `${item.progress}%`,
                    }}
                  />
                </div>

                <div className={styles.project_stats}>
                  <span>{item.completed}/{item.tasks} Tasks</span>
                  <span>{item.progress}%</span>
                </div>

                <div className={styles.project_footer}>
                  <span>{item.due}</span>

                  <div className={styles.risk}>
                    {item.risk}
                  </div>
                </div>

              </motion.div>
            ))}

          </div>

        </div>

      </div>

      <div className={styles.right_container}>

        <div className={styles.tasks_section}>

          <div className={styles.section_header}>
            <div>
              <h3>Priority Tasks</h3>
              <p>Current focus</p>
            </div>

            <button>
              Tất cả
            </button>
          </div>

          <div className={styles.tasks_list}>

            {tasks.map((item, index) => (
              <motion.div
                key={item.id}
                className={styles.task_card}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration:0.2 }}
              >

                <div
                  className={styles.progress_circle}
                  style={{
                    background: `conic-gradient(
                      #22c55e ${item.progress * 3.6}deg,
                      #e5e7eb 0deg
                    )`
                  }}
                >
                  <div className={styles.progress_inner}>
                    {item.progress}%
                  </div>
                </div>

                <div className={styles.task_content}>

                  <div className={styles.task_header}>
                    <h4>{item.name}</h4>

                    <div className={styles.priority}>
                      {item.priority}
                    </div>
                  </div>

                  <p>{item.project}</p>

                  <div className={styles.task_footer}>
                    <span>{item.due}</span>

                    <FaChevronRight />
                  </div>

                </div>

              </motion.div>
            ))}

          </div>

        </div>

        <div className={styles.ai_section}>

          <div className={styles.ai_header}>

            <div>
              <h3>Workspace AI Assistant</h3>
              <p>Powered by Gemini</p>
            </div>

            <div className={styles.ai_status}>
              Online
            </div>

          </div>

          <div className={styles.ai_messages}>

            <div className={styles.bot_message}>
              <p>
                Hello Đức 👋
                Need help managing your workspace?
              </p>
            </div>

            <div className={styles.user_message}>
              <p>
                Show delayed projects
              </p>
            </div>

            <div className={styles.bot_message}>
              <p>
                You currently have 1 delayed project:
                Realtime Chat System.
              </p>
            </div>

          </div>

          <div className={styles.ai_input_container}>

            <textarea
              placeholder="Ask Gemini anything..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <div className={styles.ai_actions}>

              <button>
                <FiPaperclip />
              </button>

              <button className={styles.send_button}>
                <FaPaperPlane />
              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Overview;


// import styles from "./Overview.module.css"
// import { TbFolderPlus } from "react-icons/tb";
// import { TbFolderBolt } from "react-icons/tb";
// import { TfiLayoutGrid3Alt } from "react-icons/tfi";
// import { TbFolderCheck } from "react-icons/tb";
// import { motion } from "framer-motion";
// import { FaChevronRight } from "react-icons/fa";
// import { useState } from "react";
// import { SlOptionsVertical } from "react-icons/sl";

// function Overview(){
//     const [activeButton, setActiveButton] = useState("manage");

//     const projects = [
//         {
//             "id":1,
//             "name":"Du an 1"
//         },
//         {
//             "id":2,
//             "name":"Du an 1"
//         },
//         {
//             "id":3,
//             "name":"Du an 1"
//         }

//     ]

//     const tasks = [
//         {
//             "id":1,
//             "name":"Task 1",
//             "piority":"Cao",
//             "project_name":"Dự án 1"
//         },
//         {
//             "id":2,
//             "name":"Task 2",
//             "piority":"Trung bình",
//             "project_name":"Dự án 1"
//         },
//         {
//             "id":3,
//             "name":"Task 3",
//             "piority":"Thấp",
//             "project_name":"Dự án 1"
//         },
//         {
//             "id":4,
//             "name":"Task 4",
//             "piority":"cao",
//             "project_name":"Dự án 1"
//         }
//     ]

//     const mockData = [
//         { project: "Dự án 1 Dự án 1 Dự án 1 Dự án 1 Dự án 1 Dự án 1Dự án 1 Dự án 1 Dự án 1 Dự án 1 Dự án 1 Dự án 1", task: "Task 7", status: "Đang diễn ra" },
//         { project: "Dự án 2", task: "Task 12", status: "Chuẩn bị" },
//         { project: "Dự án 3", task: "Task 3", status: "Đã kết thúc" },
//         { project: "Dự án 14", task: "Task 7", status: "Đang diễn ra" },
//         { project: "Dự án 22", task: "Task 12", status: "Chuẩn bị" },
//         { project: "Dự án 31", task: "Task 3", status: "Đã kết thúc" },
//     ];
//     return (
//         <>
//             <div className={styles.page}>
//                 <div className={styles.left_container}>
//                     <div className={styles.left_top_container}>
//                         <div className={`${styles.left_top_item1} ${styles.base_layout}`}>
//                             <h3>Tổng dự án</h3>
//                             <h1>20</h1>
//                             <div>
//                                 <TfiLayoutGrid3Alt  className={styles.icon} />
//                                 <p>Đang quản lý</p>
//                             </div>
//                         </div>
//                         <div className={`${styles.left_top_item2} ${styles.base_layout}`}>
//                             <h3>Công việc</h3>
//                             <h1>120</h1>
//                             <div>
//                                 <TbFolderPlus className={styles.icon} />
//                                 <p>Công việc đã tạo</p>
//                             </div>
//                         </div>
//                         <div className={`${styles.left_top_item3} ${styles.base_layout}`}>
//                             <h3>Đang thực hiện</h3>
//                             <h1>50</h1>
//                             <div>
//                                 <TbFolderBolt className={styles.icon} />
//                                 <p>Công việc</p>
//                             </div>
//                         </div>
//                         <div className={`${styles.left_top_item4} ${styles.base_layout}`}>
//                             <h3>Hoàn thành</h3>
//                             <h1>30</h1>
//                             <div>
//                                 <TbFolderCheck className={styles.icon} />
//                                 <p>Công việc</p>
//                             </div>
//                         </div>
//                     </div>
//                     <div className={`${styles.left_bottom_container} ${styles.base_layout}`}>
//                         <div>
//                             <h3>Dự án gần đây</h3>
//                             <div>
//                                 <button
//                                     className={activeButton === "manage" ? styles.button_active : ""}
//                                     onClick={() => setActiveButton("manage")}
//                                 >
//                                     Quản lý
//                                 </button>
//                                 <button
//                                     className={activeButton === "joined" ? styles.button_active : ""}
//                                     onClick={() => setActiveButton("joined")}
//                                 >
//                                     Tham gia
//                                 </button>
//                             </div>
//                         </div>
//                         <div className={styles.project_list}>
//                             <div className={styles.obj_list}>
//                                 {projects.map((item, index) =>(
//                                     <motion.div 
//                                         key={item.id} 
//                                         className={styles.project_card}
//                                         initial={{ opacity: 0, y: 30 }}
//                                         animate={{ opacity: 1, y: 0 }}
//                                         transition={{ delay: index * 0.05, duration: 0.2 }}
//                                     >
                                        
//                                     </motion.div>

//                                 ))}
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//                 <div className={styles.right_container}>
//                     <div className={`${styles.right_top_container} ${styles.base_layout}`}>
//                         <div>
//                             <div className={styles.right_top_header}>
//                                 <h3>Công việc ưu tiên</h3>
//                                 <a href="#">Tất cả</a>
//                             </div>
//                         </div>
//                         <div className={styles.list}>
//                             <div className={styles.task_list}>
//                                 {tasks.map((item, index) =>(
//                                     <motion.div key={item.id} className={styles.task_card}                             
//                                     initial={{ opacity: 0, y: 30 }}
//                                     animate={{ opacity: 1, y: 0 }}
//                                     transition={{ delay: index * 0.1, duration: 0.3 }}
//                                     >
//                                         <div>
                                            
//                                         </div>
//                                         <div>
//                                             <div>
//                                                 <div className={styles.content}>
//                                                     <p>{item.name}</p>
//                                                     <div><p>{item.piority}</p></div>
//                                                 </div>
//                                                 <div><p className={styles.project_name}>{item.project_name}</p></div>
//                                             </div>
//                                             <div>
//                                                 <FaChevronRight className={styles.icon}/>
//                                             </div>
//                                         </div>
//                                     </motion.div>
//                                 ))}
//                             </div>
//                         </div>
//                     </div>
//                     <div className={`${styles.right_bottom_container} ${styles.base_layout}`}>

//                     </div>
//                 </div>
//             </div>
//         </>
//     )

// }

// export default Overview;