import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Icone = ({ d, className = "h-[18px] w-[18px]" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={d} />
  </svg>
);

const I = {
  tableau: "M3 3h8v8H3zM13 3h8v5h-8zM13 12h8v9h-8zM3 15h8v6H3z",
  ajouter: "M12 5v14M5 12h14",
  historique: "M12 8v4l3 2M3 12a9 9 0 1018 0 9 9 0 00-18 0",
  valider: "M20 6L9 17l-5-5",
  calendrier: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  solde: "M3 12h4l3 8 4-16 3 8h4",
  soldes: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  rapport: "M9 17V9M15 17v-5M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z",
  personnel: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 108 0 4 4 0 00-8 0M22 21v-2a4 4 0 00-3-3.9",
  structure: "M12 3v4M6 21v-4M18 21v-4M4 7h16M6 17h12M6 17V7M18 17V7",
  types: "M4 6h16M4 12h16M4 18h10",
  deconnexion: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  question: "M9.1 9a3 3 0 115.8 1c0 2-3 2-3 4M12 17h.01M12 22a10 10 0 100-20 10 10 0 000 20z",
  profil: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  reglages: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z",
  agents: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
};

const LIENS_PAR_ROLE = {
  EMPLOYE: [
    {
      titre: "Mes congés",
      liens: [
        { to: "/employe", label: "Tableau de bord", icone: I.tableau },
        { to: "/employe/nouvelle-demande", label: "Nouvelle demande", icone: I.ajouter },
        { to: "/employe/historique", label: "Historique", icone: I.historique },
      ],
    },
  ],
  CHEF_SERVICE: [
    {
      titre: "Mon service",
      liens: [
        { to: "/chef", label: "Tableau de bord", icone: I.tableau },
        { to: "/chef/demandes", label: "Demandes à valider", icone: I.valider },
        { to: "/chef/calendrier", label: "Planning équipe", icone: I.calendrier },
        { to: "/chef/agents-historique", label: "Historique des agents", icone: I.personnel },
        { to: "/chef/corriger-solde", label: "Régularisation solde", icone: I.solde },
      ],
    },
    {
      titre: "Mes congés",
      liens: [
        { to: "/chef/nouvelle-demande", label: "Nouvelle demande", icone: I.ajouter },
      ],
    },
  ],
  RH: [
    {
      titre: "Gestion des congés",
      liens: [
        { to: "/rh", label: "Vue globale des soldes", icone: I.soldes },
        { to: "/rh/validation", label: "Validation des demandes", icone: I.valider },
        { to: "/rh/planning", label: "Planning global", icone: I.calendrier },
        { to: "/rh/rapports", label: "Rapports statistiques", icone: I.rapport },
      ],
    },
    {
      titre: "Mes congés",
      liens: [
        { to: "/rh/nouvelle-demande", label: "Nouvelle demande", icone: I.ajouter },
        { to: "/rh/historique", label: "Mes demandes", icone: I.historique },
      ],
    },
  ],
  ADMIN: [
    {
      titre: "Vue d'ensemble",
      liens: [
        { to: "/admin/dashboard", label: "Tableau de bord Admin", icone: I.tableau },
      ],
    },
    {
      titre: "Gestion Système",
      liens: [
        { to: "/admin/employes", label: "Gestion des Employés", icone: I.personnel },
        { to: "/admin/structure", label: "Structure Organisationnelle", icone: I.structure },
        { to: "/admin/jours-feries", label: "Jours Fériés", icone: I.calendrier },
        { to: "/admin/types-conge", label: "Types de Congés", icone: I.types },
      ],
    },
  ],
};

const NOMS_ROLES = {
  EMPLOYE: "Espace agent",
  CHEF_SERVICE: "Chef de service",
  RH: "Ressources humaines",
  ADMIN: "Administration",
};

export default function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();

  let roleCode = user?.role;
  if (roleCode === "ADMIN_RH") roleCode = "RH";

  const sections = LIENS_PAR_ROLE[roleCode] ?? [];
  const nomAffiche = user?.nomComplet || user?.username || "Utilisateur";
  const initiales = nomAffiche
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase())
    .join("");

  const dateAujourdHui = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <aside className="flex h-full min-h-screen w-72 shrink-0 flex-col border-r border-[#00efff]/40 bg-white">
      {/* En-tête */}
      <div className="border-b border-[#00efff]/40 bg-[#e7ffff]/50 px-5 py-6">
        <p className="text-2xl font-bold tracking-tight text-[#3c0038]">Ijaza</p>
        <p className="mt-0.5 text-xs text-slate-500">Gestion des congés</p>

        <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#00efff]/40 bg-white p-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#93003f] text-xs font-bold text-white">
            {initiales || "?"}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-[#3c0038]">
              {nomAffiche}
            </span>
            <span className="block truncate text-xs text-[#0097ff]">
              {NOMS_ROLES[roleCode] ?? roleCode ?? "Rôle inconnu"}
            </span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section, index) => (
          <div key={section.titre} className={index > 0 ? "mt-6" : ""}>
            <p className="px-3 pb-2 text-xs font-semibold text-slate-400">{section.titre}</p>
            <ul>
              {section.liens.map((lien) => (
                <li key={lien.to}>
                  <NavLink
                    to={lien.to}
                    end
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        isActive
                          ? "bg-[#93003f] font-semibold text-white"
                          : "font-medium text-slate-600 hover:bg-[#e7ffff] hover:text-[#3c0038]"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={isActive ? "text-white" : "text-[#0097ff]"}>
                          <Icone d={lien.icone} />
                        </span>
                        <span className="truncate">{lien.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Section Personnelle commune (Profil & Paramètres d'apparence/langue) */}
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="px-3 pb-2 text-xs font-semibold text-slate-400">Préférences</p>
          <ul>
            <li>
              <NavLink
                to="/profil"
                end
                onClick={onNavigate}
                className={({ isActive }) =>
                  `mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-[#93003f] font-semibold text-white"
                      : "font-medium text-slate-600 hover:bg-[#e7ffff] hover:text-[#3c0038]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? "text-white" : "text-[#0097ff]"}>
                      <Icone d={I.profil} />
                    </span>
                    <span className="truncate">Mon Profil</span>
                  </>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/settings"
                end
                onClick={onNavigate}
                className={({ isActive }) =>
                  `mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-[#93003f] font-semibold text-white"
                      : "font-medium text-slate-600 hover:bg-[#e7ffff] hover:text-[#3c0038]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? "text-white" : "text-[#0097ff]"}>
                      <Icone d={I.reglages} />
                    </span>
                    <span className="truncate">Paramètres (Langue / Mode)</span>
                  </>
                )}
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>

      {/* Pied de sidebar */}
      <div className="shrink-0 space-y-3 border-t border-[#00efff]/40 p-3">
        <div className="rounded-xl border border-[#00efff]/40 bg-[#e7ffff]/50 px-3.5 py-3">
          <p className="text-xs font-semibold capitalize text-[#3c0038]">{dateAujourdHui}</p>
          <a
            href="mailto:support@ijaza.local"
            className="mt-2 flex items-center gap-2 text-xs font-medium text-[#0097ff] hover:underline"
          >
            <Icone d={I.question} className="h-3.5 w-3.5" />
            Support technique
          </a>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-[#93003f]/5 hover:text-[#93003f]"
        >
          <Icone d={I.deconnexion} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}