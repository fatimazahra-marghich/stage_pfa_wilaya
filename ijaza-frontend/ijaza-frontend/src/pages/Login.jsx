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
      
      // Gestion spécifique RH sans toucher aux autres rôles
      let userRole = user?.role;
      if (userRole === 'ADMIN_RH' || userRole === 'RH Général' || userRole === 'RH_GENERAL') {
        userRole = 'RH';
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
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-neutral-50">
      {/* Panneau latéral */}
      <div className="hidden md:flex flex-col justify-between bg-black text-white p-12 select-none">
        <div>
          <span className="text-xs font-semibold tracking-widest text-neutral-400 uppercase">
            Région de l'Orientale
          </span>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-widest text-[#E91E8C] mb-2 uppercase">
            Wilaya d'Oujda
          </p>
          <h1 className="text-7xl font-black tracking-tight leading-none mb-4">
            IJAZA
          </h1>
          <p className="text-lg text-neutral-300 max-w-sm">
            Vos congés, simplifiés.
          </p>
        </div>
        <p className="text-xs text-neutral-500">
          © {new Date().getFullYear()} Wilaya d'Oujda.
        </p>
      </div>

      {/* Formulaire de connexion */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-neutral-900 tracking-tight mb-2">
              Connexion
            </h2>
            <p className="text-neutral-500 text-sm">
              Saisissez votre email et mot de passe pour accéder à votre espace personnel.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#E91E8C] tracking-wider uppercase mb-2">
                ADRESSE EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex : fatima@gmail.com"
                required
                className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#E91E8C] tracking-wider uppercase mb-2">
                MOT DE PASSE
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/20 pr-20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-500 hover:text-neutral-800"
                >
                  {showPassword ? "Masquer" : "Afficher"}
                </button>
              </div>
            </div>

            {erreur && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
                {erreur}
              </div>
            )}

            <button
              type="submit"
              disabled={chargement}
              className="w-full rounded-xl bg-[#E91E8C] text-white font-semibold py-3 hover:bg-[#c81879] transition-colors disabled:opacity-50"
            >
              {chargement ? "Connexion..." : "Se connecter"}
            </button>

            <p className="text-xs text-neutral-400 text-center pt-4">
              Accès restreint au personnel autorisé de la Wilaya.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}