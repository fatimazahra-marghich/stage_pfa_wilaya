import { useEffect, useState } from "react";
import api from "../api/axios";
import MainLayout from "../components/MainLayout";

function Icone({ nom, className = "w-5 h-5" }) {
  const chemins = {
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 2v4M16 2v4" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    save: (
      <>
        <path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M8 3v5h7M8 21v-7h8v7" />
      </>
    ),
    check: <path d="m5 12 5 5L20 7" />,
    alert: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4M12 16h.01" />
      </>
    ),
    shield: <path d="M12 3 5 6v5c0 4 3 7 7 8 4-1 7-4 7-8V6l-7-3Z" />,
    building: (
      <>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
      </>
    ),
  };

  return (
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
      {chemins[nom]}
    </svg>
  );
}

const champStyle =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#0097ff] focus:bg-white focus:ring-2 focus:ring-[#00efff]/40";

// Regex : 8 caractères min, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial
const mdpRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!\%*?&_#\-\+]).{8,}$/;

export default function ProfilPage() {
  const [profil, setProfil] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "EMPLOYE",
    solde_actuel: 0,
    service_nom: "",
  });

  const [passwords, setPasswords] = useState({
    ancien: "",
    nouveau: "",
    confirmation: "",
  });

  const [message, setMessage] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [enregistreProfil, setEnregistreProfil] = useState(false);
  const [enregistreMdp, setEnregistreMdp] = useState(false);

  // Charger le profil utilisateur connecté
  async function chargerProfil() {
    try {
      setChargement(true);
      const res = await api.get("/users/me/");
      setProfil(res.data);
    } catch (err) {
      console.error("Erreur lors du chargement du profil :", err);
      setMessage({
        type: "error",
        texte: "Impossible de charger les données du profil.",
      });
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerProfil();
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);

  // Modification Prénom / Nom
  async function handleUpdateProfil(e) {
    e.preventDefault();

    try {
      setEnregistreProfil(true);
      const res = await api.patch("/users/me/", {
        first_name: profil.first_name,
        last_name: profil.last_name,
      });

      setProfil(res.data);
      setMessage({
        type: "success",
        texte: "Profil mis à jour avec succès.",
      });
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        texte: "Erreur lors de la mise à jour du profil.",
      });
    } finally {
      setEnregistreProfil(false);
    }
  }

  // Changement de Mot de passe avec validations
  async function handleChangePassword(e) {
    e.preventDefault();

    // 1. Comparaison avec l'ancien mot de passe
    if (passwords.ancien === passwords.nouveau) {
      setMessage({
        type: "error",
        texte: "Le nouveau mot de passe doit être différent de l'ancien.",
      });
      return;
    }

    // 2. Validation de la complexité
    if (!mdpRegex.test(passwords.nouveau)) {
      setMessage({
        type: "error",
        texte: "Le nouveau mot de passe ne respecte pas les critères de sécurité.",
      });
      return;
    }

    // 3. Correspondance des mots de passe
    if (passwords.nouveau !== passwords.confirmation) {
      setMessage({
        type: "error",
        texte: "Les nouveaux mots de passe ne correspondent pas.",
      });
      return;
    }

    try {
      setEnregistreMdp(true);
      await api.post("/users/changer-mot-de-passe/", {
        old_password: passwords.ancien,
        new_password: passwords.nouveau,
      });

      setMessage({
        type: "success",
        texte: "Mot de passe modifié avec succès.",
      });

      setPasswords({
        ancien: "",
        nouveau: "",
        confirmation: "",
      });
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        texte: err.response?.data?.detail || "Erreur lors du changement de mot de passe.",
      });
    } finally {
      setEnregistreMdp(false);
    }
  }

  const initiales =
    `${profil.first_name?.[0] || ""}${profil.last_name?.[0] || ""}`.toUpperCase() ||
    "U";

  const roleLibelle =
    {
      EMPLOYE: "Employé",
      CHEF_SERVICE: "Chef de Service",
      RH: "Ressources Humaines",
      ADMIN: "Administrateur Système",
    }[profil.role] || profil.role;

  return (
    <MainLayout>
      <div className="min-h-full select-none">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Alerte / Message */}
          {message && (
            <div
              role="status"
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-sm transition-all ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                  message.type === "success"
                    ? "bg-emerald-500/15 text-emerald-600"
                    : "bg-rose-500/15 text-rose-600"
                }`}
              >
                <Icone
                  nom={message.type === "success" ? "check" : "alert"}
                  className="h-4 w-4"
                />
              </span>
              {message.texte}
            </div>
          )}

          {/* En-tête Profil */}
          <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-r from-[#6b0d3a] via-[#3c0038] to-[#001f3f] p-6 shadow-xl shadow-[#6b0d3a]/15 sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#00efff]/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-[#0097ff]/20 blur-3xl" />

            <div className="relative z-10 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
              {chargement ? (
                <div className="h-20 w-20 animate-pulse rounded-2xl bg-white/20" />
              ) : (
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#00efff] to-[#0097ff] text-2xl font-black text-[#3c0038] shadow-lg ring-4 ring-white/20">
                  {initiales}
                </div>
              )}

              <div className="text-center sm:text-left">
                <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {chargement
                    ? "Chargement…"
                    : profil.nom_complet || `${profil.first_name} ${profil.last_name}`.trim() || "Utilisateur"}
                </h1>

                <p className="mt-1 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-200 sm:justify-start">
                  <Icone nom="mail" className="h-3.5 w-3.5 text-[#00efff]" />
                  {profil.email || "—"}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md ring-1 ring-white/25">
                    <Icone nom="shield" className="h-3.5 w-3.5 text-[#00efff]" />
                    {roleLibelle}
                  </span>

                  {profil.service_nom && profil.service_nom !== "-" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-slate-200 backdrop-blur-md ring-1 ring-white/15">
                      <Icone nom="building" className="h-3.5 w-3.5 text-[#00efff]" />
                      {profil.service_nom}
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 px-6 py-4 text-center backdrop-blur-md ring-1 ring-white/20 sm:ml-auto">
                <p className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#00efff]">
                  <Icone nom="calendar" className="h-3.5 w-3.5" />
                  Solde de congés
                </p>
                <p className="mt-1 text-3xl font-black text-white">
                  {profil.solde_actuel ?? 0}
                  <span className="ml-1.5 text-xs font-normal text-slate-200">
                    jours
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Formulaire Prénom / Nom */}
            <form
              onSubmit={handleUpdateProfil}
              className="space-y-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm ring-1 ring-black/[0.01]"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#6b0d3a]/10 text-[#6b0d3a]">
                  <Icone nom="user" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#3c0038]">
                    Informations personnelles
                  </h2>
                  <p className="text-xs text-slate-500">
                    Modifiez vos informations d'identité
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-[#0097ff] uppercase">
                    PRÉNOM
                  </label>
                  <input
                    type="text"
                    value={profil.first_name || ""}
                    onChange={(e) =>
                      setProfil({ ...profil, first_name: e.target.value })
                    }
                    placeholder="Votre prénom"
                    required
                    className={champStyle}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-[#0097ff] uppercase">
                    NOM
                  </label>
                  <input
                    type="text"
                    value={profil.last_name || ""}
                    onChange={(e) =>
                      setProfil({ ...profil, last_name: e.target.value })
                    }
                    placeholder="Votre nom"
                    required
                    className={champStyle}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    ADRESSE EMAIL (NON MODIFIABLE)
                  </label>
                  <input
                    type="email"
                    value={profil.email || ""}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 text-xs font-semibold text-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={enregistreProfil}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6b0d3a] via-[#3c0038] to-[#6b0d3a] py-3 text-xs font-bold text-white shadow-md shadow-[#6b0d3a]/20 transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <Icone nom="save" className="h-4 w-4" />
                {enregistreProfil
                  ? "Enregistrement..."
                  : "Enregistrer les modifications"}
              </button>
            </form>

            {/* Formulaire Mot de passe avec validations */}
            <form
              onSubmit={handleChangePassword}
              className="space-y-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm ring-1 ring-black/[0.01]"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#003366]/10 text-[#003366]">
                  <Icone nom="lock" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#001f3f]">
                    Sécurité de l'accès
                  </h2>
                  <p className="text-xs text-slate-500">
                    Modifiez votre mot de passe de connexion
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Ancien mot de passe */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-[#0097ff] uppercase">
                    ANCIEN MOT DE PASSE
                  </label>
                  <input
                    type="password"
                    value={passwords.ancien}
                    onChange={(e) =>
                      setPasswords({ ...passwords, ancien: e.target.value })
                    }
                    required
                    placeholder="••••••••"
                    className={champStyle}
                  />
                </div>

                {/* Nouveau mot de passe */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-[#0097ff] uppercase">
                    NOUVEAU MOT DE PASSE
                  </label>
                  <input
                    type="password"
                    value={passwords.nouveau}
                    onChange={(e) =>
                      setPasswords({ ...passwords, nouveau: e.target.value })
                    }
                    required
                    placeholder="••••••••"
                    className={champStyle}
                  />

                  {/* Validation visuelle des règles */}
                  {passwords.nouveau && (
                    <div className="mt-2.5 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] space-y-1">
                      <p className={passwords.nouveau.length >= 8 ? "text-emerald-600 font-medium" : "text-slate-400"}>
                        {passwords.nouveau.length >= 8 ? "✓" : "○"} Au moins 8 caractères
                      </p>
                      <p className={/[A-Z]/.test(passwords.nouveau) ? "text-emerald-600 font-medium" : "text-slate-400"}>
                        {/[A-Z]/.test(passwords.nouveau) ? "✓" : "○"} Au moins une lettre majuscule (A-Z)
                      </p>
                      <p className={/[a-z]/.test(passwords.nouveau) ? "text-emerald-600 font-medium" : "text-slate-400"}>
                        {/[a-z]/.test(passwords.nouveau) ? "✓" : "○"} Au moins une lettre minuscule (a-z)
                      </p>
                      <p className={/\d/.test(passwords.nouveau) ? "text-emerald-600 font-medium" : "text-slate-400"}>
                        {/\d/.test(passwords.nouveau) ? "✓" : "○"} Au moins un chiffre (0-9)
                      </p>
                      <p className={/[@$!%*?&_#\-\+]/.test(passwords.nouveau) ? "text-emerald-600 font-medium" : "text-slate-400"}>
                        {/[@$!%*?&_#\-\+]/.test(passwords.nouveau) ? "✓" : "○"} Au moins un caractère spécial (@$!%*?&_#...)
                      </p>

                      {/* Comparaison Ancien vs Nouveau */}
                      {passwords.ancien && passwords.ancien === passwords.nouveau && (
                        <p className="text-rose-600 font-semibold pt-1">
                          ⚠️ Le nouveau mot de passe doit être différent de l'ancien.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirmation mot de passe */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-[#0097ff] uppercase">
                    CONFIRMATION DU MOT DE PASSE
                  </label>
                  <input
                    type="password"
                    value={passwords.confirmation}
                    onChange={(e) =>
                      setPasswords({ ...passwords, confirmation: e.target.value })
                    }
                    required
                    placeholder="••••••••"
                    className={champStyle}
                  />
                  {passwords.confirmation && passwords.nouveau !== passwords.confirmation && (
                    <p className="mt-1 text-[11px] font-medium text-rose-600">
                      ⚠️ Les mots de passe ne correspondent pas.
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  enregistreMdp ||
                  !mdpRegex.test(passwords.nouveau) ||
                  passwords.ancien === passwords.nouveau ||
                  passwords.nouveau !== passwords.confirmation
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#003366] via-[#001f3f] to-[#0097ff] py-3 text-xs font-bold text-white shadow-md shadow-[#003366]/20 transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Icone nom="lock" className="h-4 w-4" />
                {enregistreMdp
                  ? "Mise à jour en cours..."
                  : "Mettre à jour le mot de passe"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}