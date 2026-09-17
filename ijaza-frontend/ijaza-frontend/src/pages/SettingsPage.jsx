import React, { useState } from "react";
import MainLayout from "../components/MainLayout"; // Ajustez le chemin selon l'emplacement de MainLayout

// Icônes SVG
const Icone = ({ d, className = "h-5 w-5" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const I = {
  soleil: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  lune: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  langue: "M3 5h12M9 3v2m1 4h.01M4 9h12M5 9c0 5.5 3.8 10 9 11m-4-6c1.5 2 3.5 3.5 6 4.5M19 11l-4 10m0 0l-1.5-3.5M15 21l4.5-3.5",
  cloche: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  sauvegarder: "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8",
  check: "M20 6L9 17l-5-5",
};

export default function SettingsPage() {
  const [themeMode, setThemeMode] = useState("clair");
  const [langue, setLangue] = useState("fr");
  const [notificationsEmail, setNotificationsEmail] = useState(true);
  const [notifDemandes, setNotifDemandes] = useState(true);
  const [enregistre, setEnregistre] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setEnregistre(true);
    setTimeout(() => setEnregistre(false), 3000);
  };

  return (
    <MainLayout>
      {/* En-tête de la page */}
      <div className="mx-auto max-w-4xl space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#3c0038] lg:text-3xl">
              Paramètres généraux
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Personnalisez votre expérience d'utilisation, l'apparence et vos préférences de notification.
            </p>
          </div>
          <span className="hidden rounded-full border border-[#00efff]/60 bg-[#e7ffff] px-3.5 py-1.5 text-xs font-semibold text-[#3c0038] sm:inline-block">
            Espace Préférences
          </span>
        </div>
      </div>

      {/* Formulaire des paramètres */}
      <form onSubmit={handleSave} className="mx-auto mt-8 max-w-4xl space-y-6">
        
        {/* Notification de sauvegarde réussie */}
        {enregistre && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-800 shadow-sm transition-all animate-in fade-in">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
              <Icone d={I.check} className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Modifications enregistrées !</p>
              <p className="text-xs text-emerald-600">
                Vos préférences d'affichage et de notification ont été mises à jour.
              </p>
            </div>
          </div>
        )}

        {/* SECTION 1 : Apparence & Thème */}
        <section className="rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7ffff] text-[#0097ff]">
              <Icone d={I.soleil} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#3c0038]">Thème d'affichage</h2>
              <p className="text-xs text-slate-500">Choisissez le mode visuel le plus confortable pour vous</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Option Clair */}
            <button
              type="button"
              onClick={() => setThemeMode("clair")}
              className={`group flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                themeMode === "clair"
                  ? "border-[#0097ff] bg-[#e7ffff]/30 ring-2 ring-[#0097ff]/20"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`grid h-9 w-9 place-items-center rounded-lg ${themeMode === "clair" ? "bg-[#0097ff] text-white" : "bg-slate-100 text-slate-500"}`}>
                  <Icone d={I.soleil} className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#3c0038]">Mode Clair</p>
                  <p className="text-xs text-slate-500">Interface claire standard</p>
                </div>
              </div>
              <span className={`h-4 w-4 rounded-full border-2 ${themeMode === "clair" ? "border-[#0097ff] bg-[#0097ff]" : "border-slate-300"}`} />
            </button>

            {/* Option Sombre */}
            <button
              type="button"
              onClick={() => setThemeMode("sombre")}
              className={`group flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                themeMode === "sombre"
                  ? "border-[#3c0038] bg-[#3c0038]/5 ring-2 ring-[#3c0038]/20"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`grid h-9 w-9 place-items-center rounded-lg ${themeMode === "sombre" ? "bg-[#3c0038] text-white" : "bg-slate-100 text-slate-500"}`}>
                  <Icone d={I.lune} className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#3c0038]">Mode Sombre</p>
                  <p className="text-xs text-slate-500">Reposant pour les yeux</p>
                </div>
              </div>
              <span className={`h-4 w-4 rounded-full border-2 ${themeMode === "sombre" ? "border-[#3c0038] bg-[#3c0038]" : "border-slate-300"}`} />
            </button>
          </div>
        </section>

        {/* SECTION 2 : Langue et Région */}
        <section className="rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7ffff] text-[#0097ff]">
              <Icone d={I.langue} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#3c0038]">Langue de l'interface</h2>
              <p className="text-xs text-slate-500">Définissez votre langue d'affichage par défaut</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <label htmlFor="langue-select" className="text-sm font-medium text-slate-700">
                Langue principale
              </label>
              <p className="text-xs text-slate-400">Toute l'application s'affichera dans cette langue.</p>
            </div>
            
            {/* Sélecteur de langue */}
            <select
              id="langue-select"
              value={langue}
              onChange={(e) => setLangue(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors focus:border-[#0097ff] focus:outline-none focus:ring-2 focus:ring-[#0097ff]/20 sm:w-64"
            >
              <option value="fr">🇫🇷 Français (Par défaut)</option>
              <option value="ar">🇲🇦 العربية (Arabe)</option>
              <option value="en">🇬🇧 English (Anglais)</option>
            </select>
          </div>
        </section>

        {/* SECTION 3 : Notifications */}
        <section className="rounded-2xl border border-[#00efff]/30 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7ffff] text-[#0097ff]">
              <Icone d={I.cloche} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#3c0038]">Notifications</h2>
              <p className="text-xs text-slate-500">Gérez les alertes et messages automatiques</p>
            </div>
          </div>

          <div className="mt-6 space-y-5 divide-y divide-slate-100">
            {/* Toggle 1 */}
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5 pr-4">
                <p className="text-sm font-semibold text-slate-800">Notifications par Email</p>
                <p className="text-xs text-slate-500">Recevoir un récapitulatif par email lors de vos demandes de congé.</p>
              </div>
              <button
                type="button"
                onClick={() => setNotificationsEmail(!notificationsEmail)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0097ff] focus:ring-offset-2 ${
                  notificationsEmail ? "bg-[#93003f]" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notificationsEmail ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2 */}
            <div className="flex items-center justify-between pt-5">
              <div className="space-y-0.5 pr-4">
                <p className="text-sm font-semibold text-slate-800">Alertes sur le statut des demandes</p>
                <p className="text-xs text-slate-500">Être notifié immédiatement lorsqu'une demande est validée ou refusée.</p>
              </div>
              <button
                type="button"
                onClick={() => setNotifDemandes(!notifDemandes)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0097ff] focus:ring-offset-2 ${
                  notifDemandes ? "bg-[#93003f]" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifDemandes ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Bouton Enregistrer */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-[#93003f] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#3c0038] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#93003f]/50 active:scale-[0.98]"
          >
            <Icone d={I.sauvegarder} className="h-4 w-4" />
            Enregistrer les préférences
          </button>
        </div>
      </form>
    </MainLayout>
  );
}