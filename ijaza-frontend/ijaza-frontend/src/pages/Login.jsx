import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const REDIRECTION_PAR_ROLE = {
  EMPLOYE: "/employe",
  CHEF_SERVICE: "/chef",
  RH: "/rh",
  ADMIN_RH: "/rh",
  "RH Général": "/rh",
  RH_GENERAL: "/rh",
  ADMIN: "/admin/employes",
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur("");
    setChargement(true);

    try {
      const user = await login(email, password);

      let userRole = user?.role;
      if (userRole === "ADMIN_RH" || userRole === "RH Général" || userRole === "RH_GENERAL") {
        userRole = "RH";
      }

      navigate(REDIRECTION_PAR_ROLE[userRole] ?? REDIRECTION_PAR_ROLE[user?.role] ?? "/");
    } catch (err) {
      setErreur(
        err.response?.data?.detail || "Adresse email ou mot de passe incorrect."
      );
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white select-none">
      {/* Dynamic Uiverse Style with Bordeau to Blue Gradient */}
      <style>{`
        .form-uiverse-bg {
          position: relative;
          background: 
            linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.95) 0%,
              rgba(235, 245, 255, 0.8) 50%,
              rgba(255, 255, 255, 0.3) 100%
            ),
            linear-gradient(135deg, #6b0d3a 0%, #3c0038 40%, #001f3f 75%, #0097ff 100%);
        }

        .form-uiverse-bg::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: linear-gradient(90deg, rgba(0, 239, 255, 0.15) 1px, transparent 1px),
                            linear-gradient(0deg, rgba(0, 239, 255, 0.15) 1px, transparent 1px);
          background-size: 42px 42px;
          pointer-events: none;
          mask-image: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 0.35) 70%,
            rgba(0, 0, 0, 0) 100%
          );
          -webkit-mask-image: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 0.35) 70%,
            rgba(0, 0, 0, 0) 100%
          );
        }
      `}</style>

      {/* 1. PANNEAU LATÉRAL (Image avec Overlay en Dégradé Bordeau / Marine) */}
      <div className="relative hidden lg:col-span-7 lg:flex flex-col justify-between p-12 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1600&auto=format&fit=crop"
          alt="Wilaya d'Oujda Architecture"
          className="absolute inset-0 h-full w-full object-cover scale-105"
        />
        {/* Overlay riche en dégradé prune -> marine */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#3c0038]/95 via-[#6b0d3a]/85 to-[#003366]/60 backdrop-blur-[1px]" />

        {/* Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-black text-lg shadow-sm">
            IJ
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#00efff] uppercase block">
              Région de l'Orientale
            </span>
            <span className="text-xs font-semibold text-white/90">Wilaya d'Oujda</span>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-lg space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-[#00efff] animate-pulse" />
            <span className="text-xs font-medium text-white/90">Portail Officiel IJAZA</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
            Vos congés, simplifiés.
          </h1>
          <p className="text-xs leading-relaxed text-slate-200">
            Plateforme numérique fluide dédiée à la gestion du personnel et des absences de la Wilaya d'Oujda.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex justify-between items-center text-[11px] text-slate-300">
          <p>© {new Date().getFullYear()} Wilaya d'Oujda. Tous droits réservés.</p>
          <span className="text-[#00efff] font-medium">IJAZA RH v2.0</span>
        </div>
      </div>

      {/* 2. FORMULAIRE CENTRÉ (Carte Glassmorphism + Dégradé Bordeau/Bleu) */}
      <div className="lg:col-span-5 form-uiverse-bg flex items-center justify-center p-6 sm:p-8 relative">
        {/* Halo lumineux d'arrière-plan */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-[#6b0d3a]/20 blur-3xl pointer-events-none" />

        {/* Card Form */}
        <div className="relative z-10 w-full max-w-sm rounded-3xl border border-white/60 bg-white/85 backdrop-blur-xl p-8 shadow-2xl transition-all duration-300 hover:border-[#00efff]/50">
          
          <div className="text-center space-y-1 mb-6">
            <div className="lg:hidden inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6b0d3a] text-xl font-black text-white shadow-md mb-2">
              IJ
            </div>
            <h2 className="text-2xl font-bold text-[#3c0038] tracking-tight">
              Connexion
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Saisissez vos identifiants pour accéder à votre espace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-[#0097ff] tracking-wider uppercase mb-1.5">
                ADRESSE EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex : agent@oriental.ma"
                required
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-xs font-medium text-slate-800 outline-none transition focus:border-[#0097ff] focus:bg-white focus:ring-2 focus:ring-[#00efff]/40"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#0097ff] tracking-wider uppercase mb-1.5">
                MOT DE PASSE
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-xs font-medium text-slate-800 outline-none transition focus:border-[#0097ff] focus:bg-white focus:ring-2 focus:ring-[#00efff]/40 pr-20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 hover:text-[#6b0d3a] transition cursor-pointer"
                >
                  {showPassword ? "Masquer" : "Afficher"}
                </button>
              </div>
            </div>

            {erreur && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                ⚠️ {erreur}
              </div>
            )}

            {/* Bouton en dégradé Bordeau vers Bleu Marine */}
            <button
              type="submit"
              disabled={chargement}
              className="w-full rounded-xl bg-gradient-to-r from-[#6b0d3a] via-[#3c0038] to-[#003366] py-3.5 text-xs font-bold text-white shadow-lg shadow-[#6b0d3a]/20 transition hover:opacity-95 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {chargement ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Connexion...</span>
                </div>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-[10px] text-slate-400">
            Accès restreint au personnel de la Wilaya d'Oujda.
          </p>
        </div>
      </div>
    </div>
  );
}