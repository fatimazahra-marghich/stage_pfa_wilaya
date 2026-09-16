import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, rolesAutorises }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm font-medium text-neutral-500">Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Support des équivalences de rôles (ex: ADMIN_RH équivaut à RH)
  const userRole = user?.role === 'ADMIN_RH' ? 'RH' : user?.role;

  if (rolesAutorises && !rolesAutorises.includes(user.role) && !rolesAutorises.includes(userRole)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}