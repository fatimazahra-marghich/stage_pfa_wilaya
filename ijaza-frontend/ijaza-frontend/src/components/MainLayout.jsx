import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

const Icone = ({ d }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const MENU = "M4 7h16M4 12h16M4 17h16";

export default function MainLayout({ children }) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMenuOuvert(false);
  }, [pathname]);

  useEffect(() => {
    function surTouche(e) {
      if (e.key === "Escape") {
        setMenuOuvert(false);
      }
    }
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f6fdfe] dark:bg-slate-900">

      {/* SIDEBAR DESKTOP */}
      <aside className="hidden h-screen shrink-0 lg:block dark:bg-slate-900 border-r border-transparent dark:border-slate-800">
        <Sidebar />
      </aside>

      {/* DÉGRADÉ SEPARATEUR */}
      <div className="hidden h-screen w-1 shrink-0 bg-gradient-to-b from-[#e7ffff] via-[#f4fdff] to-[#eef4ff] dark:from-slate-800 dark:to-slate-900 lg:block" />

      {/* MENU MOBILE */}
      {menuOuvert && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#3c0038]/50 backdrop-blur-sm" onClick={() => setMenuOuvert(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl">
            <Sidebar onNavigate={() => setMenuOuvert(false)} />
          </aside>
        </div>
      )}

      {/* ZONE DROITE */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-gradient-to-r from-[#e7ffff] via-[#f4fdff] to-[#eef4ff] dark:from-slate-900 dark:to-slate-900">

        {/* BARRE MOBILE */}
        <header className="flex shrink-0 items-center gap-3 border-b border-[#00efff]/40 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOuvert(true)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-[#00efff]/40 text-[#3c0038] dark:text-slate-200 transition-colors hover:bg-[#e7ffff] dark:hover:bg-slate-800"
            aria-label="Ouvrir le menu"
          >
            <Icone d={MENU} />
          </button>

          <p className="text-lg font-bold tracking-tight text-[#3c0038] dark:text-white">
            Ijaza
          </p>
        </header>

        {/* CONTENU PRINCIPAL */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}