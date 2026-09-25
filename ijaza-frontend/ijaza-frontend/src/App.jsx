import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";

// Espace Employé
import DashboardEmploye from "./pages/employe/Dashboard";
import NewRequest from "./pages/employe/NewRequest";
import History from "./pages/employe/History";

// Espace Chef
import PendingRequests from "./pages/chef/PendingRequests";
import RequestDetail from "./pages/chef/RequestDetail";
import TeamCalendar from "./pages/chef/TeamCalendar";
import CorrectSolde from "./pages/chef/CorrectSolde";
import DashboardChef from "./pages/chef/DashboardChef";
import AgentHistorique from "./pages/chef/AgentHistorique";

// Espace RH
import DashboardRH from "./pages/rh/DashboardRH";
import GlobalBalances from "./pages/rh/GlobalBalances";
import RhPendingRequests from "./pages/rh/RhPendingRequests";
import RhRequestDetail from "./pages/rh/RhRequestDetail";
import RhHistory from "./pages/rh/RhHistory";
import PlanningPage from "./pages/rh/PlanningPage";
import Reports from "./pages/rh/Reports";

// Espace ADMIN
import DashboardAdminPage from "./pages/admin/DashboardAdminPage";
import EmployesPage from "./pages/admin/EmployesPage";
import StructureAdminPage from "./pages/admin/StructureAdminPage";
import JourFeriePage from "./pages/admin/JourFeriePage";
import TypeCongePage from "./pages/admin/TypeConge";

// Pages Communes (Profil & Paramètres)
import ProfilPage from "./pages/ProfilPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* 👤 Mon Profil */}
            <Route
              path="/profil"
              element={
                <ProtectedRoute rolesAutorises={["EMPLOYE", "CHEF_SERVICE", "RH", "ADMIN_RH", "ADMIN"]}>
                  <ProfilPage />
                </ProtectedRoute>
              }
            />

            {/* ⚙️ Paramètres */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute rolesAutorises={["EMPLOYE", "CHEF_SERVICE", "RH", "ADMIN_RH", "ADMIN"]}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* 👨‍💻 Espace Employé */}
            <Route path="/employe" element={<ProtectedRoute rolesAutorises={["EMPLOYE"]}><DashboardEmploye /></ProtectedRoute>} />
            <Route path="/employe/nouvelle-demande" element={<ProtectedRoute rolesAutorises={["EMPLOYE"]}><NewRequest /></ProtectedRoute>} />
            <Route path="/employe/historique" element={<ProtectedRoute rolesAutorises={["EMPLOYE"]}><History /></ProtectedRoute>} />

            {/* 👔 Espace Chef de service */}
            <Route path="/chef" element={<ProtectedRoute rolesAutorises={["CHEF_SERVICE"]}><DashboardChef /></ProtectedRoute>} />
            <Route path="/chef/demandes" element={<ProtectedRoute rolesAutorises={["CHEF_SERVICE"]}><PendingRequests /></ProtectedRoute>} />
            <Route path="/chef/demandes/:id" element={<ProtectedRoute rolesAutorises={["CHEF_SERVICE"]}><RequestDetail /></ProtectedRoute>} />
            <Route path="/chef/nouvelle-demande" element={<ProtectedRoute rolesAutorises={["CHEF_SERVICE"]}><NewRequest /></ProtectedRoute>} />
            <Route path="/chef/calendrier" element={<ProtectedRoute rolesAutorises={["CHEF_SERVICE"]}><TeamCalendar /></ProtectedRoute>} />
            <Route path="/chef/agents-historique" element={<ProtectedRoute rolesAutorises={["CHEF_SERVICE"]}><AgentHistorique /></ProtectedRoute>} />
            <Route path="/chef/agents/:id/historique" element={<ProtectedRoute rolesAutorises={["CHEF_SERVICE"]}><AgentHistorique /></ProtectedRoute>} />
            <Route path="/chef/corriger-solde" element={<ProtectedRoute rolesAutorises={["CHEF_SERVICE"]}><CorrectSolde /></ProtectedRoute>} />

            {/* 🏢 Espace RH */}
            <Route path="/rh" element={<ProtectedRoute rolesAutorises={["RH", "ADMIN_RH"]}><GlobalBalances /></ProtectedRoute>} />
            <Route path="/rh/dashboard" element={<ProtectedRoute rolesAutorises={["RH", "ADMIN_RH"]}><DashboardRH /></ProtectedRoute>} />
            <Route path="/rh/validation" element={<ProtectedRoute rolesAutorises={["RH", "ADMIN_RH"]}><RhPendingRequests /></ProtectedRoute>} />
            <Route path="/rh/demandes/:id" element={<ProtectedRoute rolesAutorises={["RH", "ADMIN_RH"]}><RhRequestDetail /></ProtectedRoute>} />
            <Route path="/rh/historique-global" element={<ProtectedRoute rolesAutorises={["RH", "ADMIN_RH"]}><RhHistory /></ProtectedRoute>} />
            <Route path="/rh/nouvelle-demande" element={<ProtectedRoute rolesAutorises={["RH", "ADMIN_RH"]}><NewRequest /></ProtectedRoute>} />
            <Route path="/rh/planning" element={<ProtectedRoute rolesAutorises={["RH", "ADMIN_RH"]}><PlanningPage /></ProtectedRoute>} />
            <Route path="/rh/rapports" element={<ProtectedRoute rolesAutorises={["RH", "ADMIN_RH"]}><Reports /></ProtectedRoute>} />

            {/* 🛠️ Espace ADMIN */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<ProtectedRoute rolesAutorises={["ADMIN"]}><DashboardAdminPage /></ProtectedRoute>} />
            <Route path="/admin/employes" element={<ProtectedRoute rolesAutorises={["ADMIN"]}><EmployesPage /></ProtectedRoute>} />
            <Route path="/admin/structure" element={<ProtectedRoute rolesAutorises={["ADMIN"]}><StructureAdminPage /></ProtectedRoute>} />
            <Route path="/admin/jours-feries" element={<ProtectedRoute rolesAutorises={["ADMIN"]}><JourFeriePage /></ProtectedRoute>} />
            <Route path="/admin/types-conge" element={<ProtectedRoute rolesAutorises={["ADMIN"]}><TypeCongePage /></ProtectedRoute>} />

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </SettingsProvider>
  );
}