import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const REDIRECTION_PAR_ROLE = {
  EMPLOYE: "/employe",
  CHEF_SERVICE: "/chef",
  ADMIN_RH: "/admin",
};

export default function Login() {
  const [matricule, setMatricule] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      const user = await login(matricule, password);
      navigate(REDIRECTION_PAR_ROLE[user.role] ?? "/");
    } catch {
      setErreur("Matricule ou mot de passe incorrect.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-white">
      <div className="hidden md:flex flex-col justify-end bg-black text-white p-12">
        <p className="text-xs tracking-widest text-white/60 mb-4">WILAYA D'OUJDA</p>
        <h1 className="text-7xl font-black leading-none mb-4">IJAZA</h1>
        <p className="text-lg text-white/70">Vos congés, simplifiés.</p>
      </div>

      <div className="flex items-center justify-center p-8">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <h2 className="text-3xl font-bold mb-2">Connexion</h2>
          <p className="text-neutral-500 mb-8 text-sm">
            Veuillez vous authentifier pour accéder à votre espace personnel.
          </p>

          <label className="block text-xs font-semibold text-[#E91E8C] mb-2">
            MATRICULE
          </label>
          <input
            type="text"
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
            placeholder="Ex : 104592"
            required
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 mb-5 text-sm outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/20"
          />

          <label className="block text-xs font-semibold text-[#E91E8C] mb-2">
            MOT DE PASSE
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 mb-2 text-sm outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/20"
          />

          {erreur && <p className="text-sm text-red-600 mb-4">{erreur}</p>}

          <button
            type="submit"
            disabled={chargement}
            className="w-full rounded-xl bg-[#E91E8C] text-white font-semibold py-3 mt-6 hover:bg-[#c81879] transition-colors disabled:opacity-50"
          >
            {chargement ? "Connexion..." : "Se connecter"}
          </button>

          <p className="text-xs text-neutral-400 text-center mt-8">
            Accès restreint au personnel autorisé de la Wilaya.
          </p>
        </form>
      </div>
    </div>
  );
}
