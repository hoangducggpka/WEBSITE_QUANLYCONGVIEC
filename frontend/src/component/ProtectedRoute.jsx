import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import React from "react";
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return <div>Checking authentication...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/overview" replace />;
  }

  // ✅ Thêm: admin không được vào MainLayout
  if (!adminOnly && isAdmin) {
    return <Navigate to="/security" replace />;
  }

  return children;
};

export default ProtectedRoute;