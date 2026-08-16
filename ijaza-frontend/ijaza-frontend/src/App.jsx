import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import DashboardEmploye from "./pages/employe/Dashboard";
import NewRequest from "./pages/employe/NewRequest";
import History from "./pages/employe/History";
import PendingRequests from "./pages/chef/PendingRequests";
import RequestDetail from "./pages/chef/RequestDetail";
import TeamCalendar from "./pages/chef/TeamCalendar";
import CorrectSolde from "./pages/chef/CorrectSolde";
import GlobalBalances from "./pages/admin/GlobalBalances";
import TypeCongePage from "./pages/admin/TypeConge";
import Structure from "./pages/admin/Structure";
import Reports from "./pages/admin/Reports";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Espace Employé */}
          <Route
            path="/employe"
            element={
              <ProtectedRoute rolesAutorises={["EMPLOYE", "CHEF_SERVICE", "ADMIN_RH"]}>
                <DashboardEmploye />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employe/nouvelle-demande"
            element={
              <ProtectedRoute rolesAutorises={["EMPLOYE", "CHEF_SERVICE", "ADMIN_RH"]}>
                <NewRequest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employe/historique"
            element={
              <ProtectedRoute rolesAutorises={["EMPLOYE", "CHEF_SERVICE", "ADMIN_RH"]}>
                <History />
              </ProtectedRoute>
            }
          />

          {/* Espace Chef de service */}
          <Route
            path="/chef"
            element={
              <ProtectedRoute rolesAutorises={["CHEF_SERVICE"]}>
                <PendingRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chef/demandes"
            element={
              <ProtectedRoute rolesAutorises={["CHEF_SERVICE"]}>
                <PendingRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chef/demandes/:id"
            element={
              <ProtectedRoute rolesAutorises={["CHEF_SERVICE"]}>
                <RequestDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chef/calendrier"
            element={
              <ProtectedRoute rolesAutorises={["CHEF_SERVICE"]}>
                <TeamCalendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chef/corriger-solde"
            element={
              <ProtectedRoute rolesAutorises={["CHEF_SERVICE"]}>
                <CorrectSolde />
              </ProtectedRoute>
            }
          />

          {/* Espace Admin RH */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute rolesAutorises={["ADMIN_RH"]}>
                <GlobalBalances />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/types-conge"
            element={
              <ProtectedRoute rolesAutorises={["ADMIN_RH"]}>
                <TypeCongePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/structure"
            element={
              <ProtectedRoute rolesAutorises={["ADMIN_RH"]}>
                <Structure />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rapports"
            element={
              <ProtectedRoute rolesAutorises={["ADMIN_RH"]}>
                <Reports />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
