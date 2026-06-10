//src/MainLayout.jsx

import { Routes, Route } from "react-router-dom";
import NavBar from "./component/NavBar"
import Profile from "./page/Profile";
import styles from './MainLayout.module.css';

import Overview from "./page/Overview";
import Projects from "./page/Projects";
import Groups from "./page/Groups";
import Messages from "./page/Messages";
import ProjectDetail from "./page/ProjectDetail";
import GroupDetail from "./page/GroupDetail";
import Tasks from "./page/Tasks";
import { useEffect } from "react";


const MainLayout = () => {

  useEffect(() => {
    const token = localStorage.getItem("access");

    const ws = new WebSocket(
      `ws://127.0.0.1:8000/ws/presence/?token=${token}`
    );

    ws.onopen = () => {
      console.log("Presence connected");
    };

    return () => {
      ws.close();
    };
  }, []);
  
  return (
    <div className={styles.App_container}> 

      <div className={styles.navbar}>
        <NavBar />
      </div>
      <div className={styles.maincontent}>
        <Routes>
          <Route path="overview" element={<Overview />} />
          <Route path="projects" element={<Projects />} />
          <Route path="groups" element={<Groups />} />
          <Route path="messages" element={<Messages />} />
          <Route path="/project-detail/:uuid" element={<ProjectDetail />} />
          <Route path="/group-detail/:uuid" element={<GroupDetail />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="profile" element={<Profile />} />

        </Routes>
      </div>
      {/* <div className={styles.Sidebar}>
        <Sidebar />
        <SearchModal />  
      </div> */}

      {/* <div className={styles.MainContent}>
        <Routes>
          <Route path="overview" element={<OverviewPage />} />
          <Route path="group" element={<GroupPage />} />
          <Route path="projects" element={<Projects />} />
          <Route path="tasks" element={<TaskPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<Profile />} />
          <Route path="help" element={<Help />} />
          <Route path="/groups/:uuid" element={<GroupDetail />} />
          <Route path="/projects/:uuid" element={<ProjectDetail />} />
        </Routes>
      </div> */}
    </div>
  );
};

export default MainLayout;
