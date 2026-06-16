import { Routes, Route } from "react-router-dom";
import React from "react";
import ProtectedRoute from "./component/ProtectedRoute";
import MainLayout from "./MainLayout";
import Login from "./page/Login";
import { useAuth } from "./context/AuthContext";

function App() {
    const { loading } = useAuth();

    if (loading) return null;
    

    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            <Route
                path="/*"
                element={
                    <ProtectedRoute>
                        <MainLayout />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}
export default App;

//src/App.jsx
// import { Routes, Route } from "react-router-dom";
// import ProtectedRoute from "./component/ProtectedRoute";
// import MainLayout from "./MainLayout";
// import Login from "./page/Login";
// import { useAuth } from "./context/AuthContext";
// import SecurityLayout from "./SecurityLayout";

// function App() {
//     const { isAdmin, loading } = useAuth();

//     if (loading) {
//         return null;
//     }

//     return (

//         <Routes>

//             {/* PUBLIC */}

//             <Route
//                 path="/login"
//                 element={<Login />}
//             />

//             {/* ADMIN */}

//             {
//                 isAdmin && (
//                     <Route
//                         path="/security/*"
//                         element={
//                             <ProtectedRoute>
//                                 <SecurityLayout />
//                             </ProtectedRoute>
//                         }
//                     />
//                 )
//             }

//             {/* NORMAL USER */}

//             <Route
//                 path="/*"
//                 element={
//                     <ProtectedRoute>
//                         <MainLayout />
//                     </ProtectedRoute>
//                 }
//             />

//         </Routes>
//     );
// }

// export default App;
// return (
//   <Routes>

//     {/* Public route */}
//     <Route path="/login" element={<Login />} />

//     {/* Private route */}
//     <Route
//       path="/*"
//       element={
//         <ProtectedRoute>
//           <MainLayout />
//         </ProtectedRoute>
//       }
//     />

//   </Routes>
// );



// import styles from './App.module.css'
// import { Routes, Route } from "react-router-dom";
// import Sidebar from './components/Sidebar';
// import OverviewPage from './pages/OverviewPage';
// import GroupPage from './pages/GroupPage';
// import Projects from './pages/Projects';
// import TaskPage from './pages/TaskPage';
// import NotificationsPage from './pages/NotificationsPage'
// import Profile from './pages/Profile';
// import Help from './pages/Help';
// import Login from './pages/Login';

// function App() {

//   return (
//     <>
//       <div className={styles.App_container}>
//         <div className={styles.Sidebar}>
//           <Sidebar />
//         </div>
//         <div className={styles.MainContent}>
//           <Routes>
//             <Route path="overview" element={<OverviewPage />} />
//             <Route path="group" element={<GroupPage />} />
//             <Route path="projects" element={<Projects />} />
//             <Route path="tasks" element={<TaskPage />} />
//             <Route path="notifications" element={<NotificationsPage />} />
//             <Route path="profile" element={<Profile />} />
//             <Route path="help" element={<Help />} />
//           </Routes>
//         </div>
//       </div>
//     </>
//   )
// }

// export default App
