import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, rolesAutorises }) {
  const { user, loading } = useAuth();

  // Attendre la vérification de la session avant de rediriger
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm font-medium text-neutral-500">Chargement...</p>
      </div>
    );
  }

  // Rediriger vers le login si l'utilisateur n'est pas connecté
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Rediriger si l'utilisateur n'a pas le rôle requis
  if (rolesAutorises && !rolesAutorises.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}