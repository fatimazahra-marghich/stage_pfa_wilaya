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

// Pages Espace RH
import GlobalBalances from "./pages/rh/GlobalBalances";
import RhPendingRequests from "./pages/rh/RhPendingRequests";
import PlanningPage from "./pages/rh/PlanningPage";
import Reports from "./pages/rh/Reports";

// Pages Espace ADMIN
import EmployesPage from "./pages/admin/EmployesPage";
import StructureAdminPage from "./pages/admin/StructureAdminPage";
import JourFeriePage from "./pages/admin/JourFeriePage";
import TypeCongePage from "./pages/admin/TypeConge";

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
              <ProtectedRoute rolesAutorises={["EMPLOYE", "CHEF_SERVICE", "RH", "ADMIN_RH"]}>
                <DashboardEmploye />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employe/nouvelle-demande"
            element={
              <ProtectedRoute rolesAutorises={["EMPLOYE", "CHEF_SERVICE", "RH", "ADMIN_RH"]}>
                <NewRequest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employe/historique"
            element={
              <ProtectedRoute rolesAutorises={["EMPLOYE", "CHEF_SERVICE", "RH", "ADMIN_RH"]}>
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
            path="/chef/nouvelle-demande"
            element={
              <ProtectedRoute rolesAutorises={["CHEF_SERVICE"]}>
                <NewRequest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chef/historique"
            element={
              <ProtectedRoute rolesAutorises={["CHEF_SERVICE"]}>
                <History />
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

          {/* 🏢 Espace RH */}
          <Route
            path="/rh"
            element={
              <ProtectedRoute rolesAutorises={["RH", "ADMIN_RH"]}>
                <GlobalBalances />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rh/validation"
            element={
              <ProtectedRoute rolesAutorises={["RH", "ADMIN_RH"]}>
                <RhPendingRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rh/nouvelle-demande"
            element={
              <ProtectedRoute rolesAutorises={["RH", "ADMIN_RH"]}>
                <NewRequest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rh/historique"
            element={
              <ProtectedRoute rolesAutorises={["RH", "ADMIN_RH"]}>
                <History />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rh/planning"
            element={
              <ProtectedRoute rolesAutorises={["RH", "ADMIN_RH"]}>
                <PlanningPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rh/rapports"
            element={
              <ProtectedRoute rolesAutorises={["RH", "ADMIN_RH"]}>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* ⚙️ Espace ADMIN */}
          <Route
            path="/admin"
            element={<Navigate to="/admin/employes" replace />}
          />
          <Route
            path="/admin/employes"
            element={
              <ProtectedRoute rolesAutorises={["ADMIN"]}>
                <EmployesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/structure"
            element={
              <ProtectedRoute rolesAutorises={["ADMIN"]}>
                <StructureAdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/jours-feries"
            element={
              <ProtectedRoute rolesAutorises={["ADMIN"]}>
                <JourFeriePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/types-conge"
            element={
              <ProtectedRoute rolesAutorises={["ADMIN"]}>
                <TypeCongePage />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}