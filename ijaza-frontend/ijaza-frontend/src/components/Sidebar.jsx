import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

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
};

export default function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const { t, langue } = useLanguage();

  let roleCode = user?.role;
  if (roleCode === "ADMIN_RH") roleCode = "RH";

  const getSections = () => ({
    EMPLOYE: [
      {
        titre: t("myLeaves"),
        liens: [
          { to: "/employe", label: t("dashboard"), icone: I.tableau },
          { to: "/employe/nouvelle-demande", label: t("newRequest"), icone: I.ajouter },
          { to: "/employe/historique", label: t("history"), icone: I.historique },
        ],
      },
    ],
    CHEF_SERVICE: [
      {
        titre: t("myService"),
        liens: [
          { to: "/chef", label: t("dashboard"), icone: I.tableau },
          { to: "/chef/demandes", label: t("requestsToValidate"), icone: I.valider },
          { to: "/chef/calendrier", label: t("teamPlanning"), icone: I.calendrier },
          { to: "/chef/agents-historique", label: t("agentHistory"), icone: I.personnel },
          { to: "/chef/corriger-solde", label: t("balanceCorrection"), icone: I.solde },
        ],
      },
      {
        titre: t("myLeaves"),
        liens: [
          { to: "/chef/nouvelle-demande", label: t("newRequest"), icone: I.ajouter },
        ],
      },
    ],
    RH: [
      {
        titre: t("hrSpace"),
        liens: [
          { to: "/rh/dashboard", label: t("dashboardRh"), icone: I.tableau },
          { to: "/rh/validation", label: t("validationRequests"), icone: I.valider },
          { to: "/rh/historique-global", label: t("globalHistory"), icone: I.historique },
          { to: "/rh", label: t("globalBalances"), icone: I.soldes },
          { to: "/rh/planning", label: t("globalPlanning"), icone: I.calendrier },
          { to: "/rh/rapports", label: t("reports"), icone: I.rapport },
        ],
      },
      {
        titre: t("myLeaves"),
        liens: [
          { to: "/rh/nouvelle-demande", label: t("newRequest"), icone: I.ajouter },
        ],
      },
    ],
    ADMIN: [
      {
        titre: t("overview"),
        liens: [
          { to: "/admin/dashboard", label: t("dashboardAdmin"), icone: I.tableau },
        ],
      },
      {
        titre: t("systemMgmt"),
        liens: [
          { to: "/admin/employes", label: t("employees"), icone: I.personnel },
          { to: "/admin/structure", label: t("structure"), icone: I.structure },
          { to: "/admin/jours-feries", label: t("holidays"), icone: I.calendrier },
          { to: "/admin/types-conge", label: t("leaveTypes"), icone: I.types },
        ],
      },
    ],
  });

  const sections = getSections()[roleCode] ?? [];
  const nomAffiche = user?.nomComplet || user?.username || "Utilisateur";
  const initiales = nomAffiche
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase())
    .join("");

  const localeDate = langue === "ar" ? "ar-MA" : langue === "en" ? "en-US" : "fr-FR";
  const dateAujourdHui = new Date().toLocaleDateString(localeDate, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <aside className="flex h-full min-h-screen w-72 shrink-0 flex-col border-r border-[#00efff]/40 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
      {/* En-tête */}
      <div className="border-b border-[#00efff]/40 dark:border-slate-800 bg-[#e7ffff]/50 dark:bg-slate-800/50 px-5 py-6">
        <p className="text-2xl font-bold tracking-tight text-[#3c0038] dark:text-white">Ijaza</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Gestion des congés</p>

        <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#00efff]/40 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#93003f] text-xs font-bold text-white">
            {initiales || "?"}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-[#3c0038] dark:text-slate-100">
              {nomAffiche}
            </span>
            <span className="block truncate text-xs text-[#0097ff] dark:text-[#00efff]">
              {t(`role_${roleCode}`) ?? roleCode ?? "Rôle inconnu"}
            </span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section, index) => (
          <div key={index} className={index > 0 ? "mt-6" : ""}>
            <p className="px-3 pb-2 text-xs font-semibold text-slate-400 dark:text-slate-500">{section.titre}</p>
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
                          : "font-medium text-slate-600 dark:text-slate-300 hover:bg-[#e7ffff] dark:hover:bg-slate-800 hover:text-[#3c0038] dark:hover:text-white"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={isActive ? "text-white" : "text-[#0097ff] dark:text-[#00efff]"}>
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

        {/* Section Préférences */}
        <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
          <p className="px-3 pb-2 text-xs font-semibold text-slate-400 dark:text-slate-500">{t("preferences")}</p>
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
                      : "font-medium text-slate-600 dark:text-slate-300 hover:bg-[#e7ffff] dark:hover:bg-slate-800 hover:text-[#3c0038] dark:hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? "text-white" : "text-[#0097ff] dark:text-[#00efff]"}>
                      <Icone d={I.profil} />
                    </span>
                    <span className="truncate">{t("profile")}</span>
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
                      : "font-medium text-slate-600 dark:text-slate-300 hover:bg-[#e7ffff] dark:hover:bg-slate-800 hover:text-[#3c0038] dark:hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? "text-white" : "text-[#0097ff] dark:text-[#00efff]"}>
                      <Icone d={I.reglages} />
                    </span>
                    <span className="truncate">{t("settings")}</span>
                  </>
                )}
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>

      {/* Pied de sidebar */}
      <div className="shrink-0 space-y-3 border-t border-[#00efff]/40 dark:border-slate-800 p-3">
        <div className="rounded-xl border border-[#00efff]/40 dark:border-slate-700 bg-[#e7ffff]/50 dark:bg-slate-800/50 px-3.5 py-3">
          <p className="text-xs font-semibold capitalize text-[#3c0038] dark:text-slate-200">{dateAujourdHui}</p>
          <a
            href="mailto:support@ijaza.local"
            className="mt-2 flex items-center gap-2 text-xs font-medium text-[#0097ff] dark:text-[#00efff] hover:underline"
          >
            <Icone d={I.question} className="h-3.5 w-3.5" />
            {t("support")}
          </a>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-[#93003f]/5 hover:text-[#93003f] dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <Icone d={I.deconnexion} />
          {t("logout")}
        </button>
      </div>
    </aside>
  );
}