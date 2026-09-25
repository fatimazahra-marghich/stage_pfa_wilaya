import React, { useState, useEffect } from "react";
import MainLayout from "../components/MainLayout";
import { useLanguage } from "../context/LanguageContext";

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
  soleil:
    "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  lune: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  langue:
    "M3 5h12M9 3v2m1 4h.01M4 9h12M5 9c0 5.5 3.8 10 9 11m-4-6c1.5 2 3.5 3.5 6 4.5M19 11l-4 10m0 0l-1.5-3.5M15 21l4.5-3.5",
  info:
    "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  sauvegarder:
    "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8",
  check: "M20 6L9 17l-5-5",
};

export default function SettingsPage() {
  const { langue, setLangue, t } = useLanguage();

  const [themeMode, setThemeMode] = useState(
    () => localStorage.getItem("app_theme") || "clair"
  );

  const [enregistre, setEnregistre] = useState(false);

  useEffect(() => {
    if (themeMode === "sombre") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [themeMode]);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem("app_theme", themeMode);

    setEnregistre(true);
    setTimeout(() => setEnregistre(false), 3000);
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl space-y-2 select-none">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#3c0038] dark:text-white lg:text-3xl">
              {t("settings")}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {langue === "ar"
                ? "تخصيص تجربة الاستخدام والمظهر الخاص بك."
                : langue === "en"
                ? "Customize your user experience and display preferences."
                : "Personnalisez votre expérience d'utilisation et vos préférences d'affichage."}
            </p>
          </div>
          <span className="hidden rounded-full border border-[#00efff]/60 bg-[#e7ffff] dark:bg-slate-800 dark:border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-[#3c0038] dark:text-[#00efff] sm:inline-block">
            {t("preferences")}
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="mx-auto mt-8 max-w-4xl space-y-6 select-none">
        {enregistre && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/80 p-4 text-emerald-800 dark:text-emerald-200 shadow-sm transition-all animate-in fade-in">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
              <Icone d={I.check} className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {langue === "ar" ? "تم حفظ التغييرات!" : langue === "en" ? "Changes saved!" : "Modifications enregistrées !"}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {langue === "ar" 
                  ? "تم حفظ تفضيلات العرض بنجاح." 
                  : langue === "en" 
                  ? "Your display preferences have been saved." 
                  : "Vos préférences d'affichage ont été sauvegardées."}
              </p>
            </div>
          </div>
        )}

        {/* SECTION 1 : Apparence */}
        <section className="rounded-2xl border border-[#00efff]/30 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7ffff] dark:bg-slate-800 text-[#0097ff] dark:text-[#00efff]">
              <Icone d={I.soleil} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#3c0038] dark:text-slate-100">
                {langue === "ar" ? "مظهر العرض" : langue === "en" ? "Display Theme" : "Thème d'affichage"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {langue === "ar" ? "اختر الوضع البصري الأكثر راحة لك" : langue === "en" ? "Choose the visual mode most comfortable for you" : "Choisissez le mode visuel le plus confortable pour vous"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setThemeMode("clair")}
              className={`group flex items-center justify-between rounded-xl border p-4 text-left transition-all cursor-pointer ${
                themeMode === "clair"
                  ? "border-[#0097ff] bg-[#e7ffff]/30 ring-2 ring-[#0097ff]/20 dark:bg-slate-800 dark:border-[#00efff]"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`grid h-9 w-9 place-items-center rounded-lg ${themeMode === "clair" ? "bg-[#0097ff] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                  <Icone d={I.soleil} className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#3c0038] dark:text-slate-100">
                    {langue === "ar" ? "الوضع الفاتح" : langue === "en" ? "Light Mode" : "Mode Clair"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {langue === "ar" ? "واجهة فاتحة قياسية" : langue === "en" ? "Standard light interface" : "Interface claire standard"}
                  </p>
                </div>
              </div>
              <span className={`h-4 w-4 rounded-full border-2 ${themeMode === "clair" ? "border-[#0097ff] bg-[#0097ff]" : "border-slate-300 dark:border-slate-600"}`} />
            </button>

            <button
              type="button"
              onClick={() => setThemeMode("sombre")}
              className={`group flex items-center justify-between rounded-xl border p-4 text-left transition-all cursor-pointer ${
                themeMode === "sombre"
                  ? "border-[#3c0038] dark:border-[#00efff] bg-[#3c0038]/5 dark:bg-slate-800 ring-2 ring-[#3c0038]/20 dark:ring-[#00efff]/20"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`grid h-9 w-9 place-items-center rounded-lg ${themeMode === "sombre" ? "bg-[#3c0038] dark:bg-[#00efff] text-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                  <Icone d={I.lune} className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#3c0038] dark:text-slate-100">
                    {langue === "ar" ? "الوضع الداكن" : langue === "en" ? "Dark Mode" : "Mode Sombre"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {langue === "ar" ? "مريح للعينين" : langue === "en" ? "Easy on the eyes" : "Reposant pour les yeux"}
                  </p>
                </div>
              </div>
              <span className={`h-4 w-4 rounded-full border-2 ${themeMode === "sombre" ? "border-[#3c0038] dark:border-[#00efff] bg-[#3c0038] dark:bg-[#00efff]" : "border-slate-300 dark:border-slate-600"}`} />
            </button>
          </div>
        </section>

        {/* SECTION 2 : Langue */}
        <section className="rounded-2xl border border-[#00efff]/30 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7ffff] dark:bg-slate-800 text-[#0097ff] dark:text-[#00efff]">
              <Icone d={I.langue} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#3c0038] dark:text-slate-100">
                {langue === "ar" ? "لغة الواجهة" : langue === "en" ? "Interface Language" : "Langue de l'interface"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {langue === "ar" ? "حدد لغة العرض الافتراضية الخاصة بك" : langue === "en" ? "Set your default display language" : "Définissez votre langue d'affichage par défaut"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <label htmlFor="langue-select" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {langue === "ar" ? "اللغة الرئيسية" : langue === "en" ? "Main Language" : "Langue principale"}
              </label>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {langue === "ar" ? "سيتم عرض التطبيق بالكامل بهذه اللغة." : langue === "en" ? "The entire application will be displayed in this language." : "Toute l'application s'affichera dans cette langue."}
              </p>
            </div>
            
            <select
              id="langue-select"
              value={langue}
              onChange={(e) => setLangue(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors focus:border-[#0097ff] focus:outline-none focus:ring-2 focus:ring-[#0097ff]/20 sm:w-64 cursor-pointer"
            >
              <option value="fr">FR Français</option>
              <option value="ar">MA العربية</option>
              <option value="en">GB English</option>
            </select>
          </div>
        </section>

        {/* SECTION 3 : À propos du système */}
        <section className="rounded-2xl border border-[#00efff]/30 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7ffff] dark:bg-slate-800 text-[#0097ff] dark:text-[#00efff]">
              <Icone d={I.info} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#3c0038] dark:text-slate-100">
                {langue === "ar" ? "حول التطبيق" : langue === "en" ? "About System" : "À propos du système"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {langue === "ar" ? "معلومات حول الإصدار والتطوير" : langue === "en" ? "Information about version and development" : "Informations générales et version de l'application"}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-slate-500 dark:text-slate-400">
                {langue === "ar" ? "إصدار التطبيق" : langue === "en" ? "Application Version" : "Version de l'application"}
              </span>
              <span className="font-semibold text-[#3c0038] dark:text-[#00efff]">v1.0.0</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-slate-500 dark:text-slate-400">
                {langue === "ar" ? "المطور" : langue === "en" ? "Developer" : "Développeur"}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                MARGHICH Fatima zahra
              </span>
            </div>

            <div className="flex items-center justify-between pb-1">
              <span className="text-slate-500 dark:text-slate-400">
                {langue === "ar" ? "حالة النظام" : langue === "en" ? "System Status" : "Statut du système"}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {langue === "ar" ? "متصل ومحدث" : langue === "en" ? "Online & Updated" : "En ligne & à jour"}
              </span>
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-[#93003f] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#3c0038] cursor-pointer"
          >
            <Icone d={I.sauvegarder} className="h-4 w-4" />
            {langue === "ar" ? "حفظ التفضيلات" : langue === "en" ? "Save Preferences" : "Enregistrer les préférences"}
          </button>
        </div>
      </form>
    </MainLayout>
  );
}