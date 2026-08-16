import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, rolesAutorises }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (rolesAutorises && !rolesAutorises.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
