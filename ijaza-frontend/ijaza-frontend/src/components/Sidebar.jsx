import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LIENS_PAR_ROLE = {
  EMPLOYE: [
    { to: "/employe", label: "Tableau de bord" },
    { to: "/employe/nouvelle-demande", label: "Nouvelle demande" },
    { to: "/employe/historique", label: "Historique" },
  ],
  CHEF_SERVICE: [
    { to: "/chef", label: "Tableau de bord" },
    { to: "/chef/demandes", label: "Demandes à valider" },
    { to: "/chef/nouvelle-demande", label: "Nouvelle demande (Mes congés)" },
    { to: "/chef/historique", label: "Mes demandes" },
    { to: "/chef/calendrier", label: "Planning équipe" },
    { to: "/chef/corriger-solde", label: "Régularisation solde" },
  ],
  // 🏢 ESPACE RH (Opérationnel Congés)
  RH: [
    { to: "/rh", label: "Vue globale des soldes" },
    { to: "/rh/validation", label: "Validation des demandes" },
    { to: "/rh/nouvelle-demande", label: "Nouvelle demande (Mes congés)" },
    { to: "/rh/historique", label: "Mes demandes" },
    { to: "/rh/planning", label: "Planning global" },
    { to: "/rh/rapports", label: "Rapports statistiques" },
  ],
  // ⚙️ ESPACE ADMIN (Système & Structure)
  ADMIN: [
    { to: "/admin/employes", label: "Gestion du personnel" },
    { to: "/admin/structure", label: "Structure administrative" },
    { to: "/admin/jours-feries", label: "Jours fériés & Fêtes" },
    { to: "/admin/types-conge", label: "Types de congés" },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  
  // Normalisation du rôle ('ADMIN_RH' redirigé vers 'RH' par rétrocompatibilité)
  let roleCode = user?.role;
  if (roleCode === 'ADMIN_RH') roleCode = 'RH';

  const liens = LIENS_PAR_ROLE[roleCode] ?? [];

  return (
    <aside className="w-64 shrink-0 border-r border-black/10 bg-white flex flex-col justify-between min-h-screen">
      <div>
        <div className="px-6 py-6 border-b border-black/10">
          <p className="text-2xl font-black tracking-tight">Ijaza</p>
          <p className="text-xs text-neutral-500 mt-1">{user?.nomComplet || user?.username}</p>
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-pink-100 text-[#E91E8C] mt-1">
            Espace {roleCode}
          </span>
        </div>
        <nav className="p-3">
          {liens.map((lien) => (
            <NavLink
              key={lien.to}
              to={lien.to}
              end
              className={({ isActive }) =>
                `block rounded-xl px-4 py-3 mb-1 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#E91E8C] text-white"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`
              }
            >
              {lien.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="p-3 border-t border-black/10">
        <button
          onClick={logout}
          className="w-full rounded-xl px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100 text-left"
        >
          Déconnexion
        </button>
      </div>
    </aside>
  );
}