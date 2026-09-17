
import { useEffect, useState } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";

/* Palette
   #3c0038 prune   #93003f bordeaux   #0097ff bleu
   #00efff cyan    #e7ffff cyan pâle */

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

    shield: (
      <path d="M12 3 5 6v5c0 4 3 7 7 8 4-1 7-4 7-8V6l-7-3Z" />
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
  "w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-[#3c0038] outline-none transition-all placeholder:text-slate-400 focus:border-[#0097ff] focus:bg-white focus:ring-4 focus:ring-[#0097ff]/10";

export default function ProfilPage() {
  const [profil, setProfil] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "EMPLOYE",
    solde_conge: 30,
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

  async function chargerProfil() {
    try {
      setChargement(true);

      const res = await api.get("/profil/");
      setProfil(res.data);
    } catch (err) {
      console.error("Erreur chargement profil :", err);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerProfil();
  }, []);

  useEffect(() => {
    if (!message) return;

    const t = setTimeout(() => setMessage(null), 4000);

    return () => clearTimeout(t);
  }, [message]);

  async function handleUpdateProfil(e) {
    e.preventDefault();

    try {
      setEnregistreProfil(true);

      await api.patch("/profil/", {
        first_name: profil.first_name,
        last_name: profil.last_name,
      });

      setMessage({
        type: "success",
        texte: "Profil mis à jour avec succès.",
      });
    } catch (err) {
      console.error(err);

      setMessage({
        type: "error",
        texte: "Erreur lors de la mise à jour.",
      });
    } finally {
      setEnregistreProfil(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();

    if (passwords.nouveau !== passwords.confirmation) {
      setMessage({
        type: "error",
        texte: "Les mots de passe ne correspondent pas.",
      });

      return;
    }

    try {
      setEnregistreMdp(true);

      await api.post("/profil/changer-mot-de-passe/", {
        old_password: passwords.ancien,
        new_password: passwords.nouveau,
      });

      setMessage({
        type: "success",
        texte: "Mot de passe changé avec succès.",
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
        texte: "Erreur lors du changement de mot de passe.",
      });
    } finally {
      setEnregistreMdp(false);
    }
  }

  const initiales =
    `${profil.first_name?.[0] || ""}${profil.last_name?.[0] || ""}`.toUpperCase() ||
    "U";

  return (
    <Layout>
      <div className="min-h-full">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Notification */}
          {message && (
            <div
              role="status"
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition-all ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                  message.type === "success"
                    ? "bg-emerald-500/15"
                    : "bg-rose-500/15"
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

          {/* Bannière en-tête */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#3c0038] via-[#6b0040] to-[#93003f] p-6 shadow-xl shadow-[#3c0038]/20 sm:p-8">
            {/* Halos décoratifs */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#00efff]/20 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-[#0097ff]/20 blur-3xl" />

            <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-center">
              {chargement ? (
                <div className="h-20 w-20 animate-pulse rounded-2xl bg-white/20" />
              ) : (
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#00efff] to-[#0097ff] text-2xl font-extrabold text-[#3c0038] shadow-lg ring-4 ring-white/20">
                  {initiales}
                </div>
              )}

              <div className="text-center sm:text-left">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {chargement
                    ? "Chargement…"
                    : `${profil.first_name} ${profil.last_name}`.trim() ||
                      "Utilisateur"}
                </h1>

                <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-[#e7ffff]/80 sm:justify-start">
                  <Icone nom="mail" className="h-4 w-4" />
                  {profil.email || "—"}
                </p>

                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm ring-1 ring-white/25">
                  <Icone nom="shield" className="h-3.5 w-3.5" />
                  {profil.role}
                </span>
              </div>

              {/* Solde congés */}
              <div className="rounded-2xl bg-white/10 px-5 py-4 text-center backdrop-blur-sm ring-1 ring-white/15 sm:ml-auto">
                <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#e7ffff]/70">
                  <Icone nom="calendar" className="h-3.5 w-3.5" />
                  Solde de congés
                </p>

                <p className="mt-1 text-3xl font-extrabold text-white">
                  {profil.solde_conge ?? 0}

                  <span className="ml-1 text-sm font-normal text-[#e7ffff]/70">
                    jours
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Formulaires */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Informations personnelles */}
            <form
              onSubmit={handleUpdateProfil}
              className="space-y-5 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm ring-1 ring-black/[0.02]"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#93003f]/10 text-[#93003f]">
                  <Icone nom="user" />
                </span>

                <div>
                  <h2 className="text-base font-bold text-[#3c0038]">
                    Informations personnelles
                  </h2>

                  <p className="text-xs text-slate-500">
                    Mettez à jour votre nom et prénom
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Prénom
                  </label>

                  <input
                    type="text"
                    value={profil.first_name}
                    onChange={(e) =>
                      setProfil({
                        ...profil,
                        first_name: e.target.value,
                      })
                    }
                    placeholder="Votre prénom"
                    className={champStyle}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Nom
                  </label>

                  <input
                    type="text"
                    value={profil.last_name}
                    onChange={(e) =>
                      setProfil({
                        ...profil,
                        last_name: e.target.value,
                      })
                    }
                    placeholder="Votre nom"
                    className={champStyle}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Adresse e-mail
                  </label>

                  <input
                    type="email"
                    value={profil.email}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={enregistreProfil}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#93003f] to-[#3c0038] py-2.5 text-sm font-semibold text-white shadow-md shadow-[#93003f]/25 transition-all hover:shadow-lg hover:shadow-[#93003f]/30 active:scale-[0.98] disabled:opacity-60"
              >
                <Icone nom="save" className="h-4 w-4" />

                {enregistreProfil
                  ? "Enregistrement…"
                  : "Enregistrer les modifications"}
              </button>
            </form>

            {/* Sécurité / mot de passe */}
            <form
              onSubmit={handleChangePassword}
              className="space-y-5 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm ring-1 ring-black/[0.02]"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0097ff]/10 text-[#0097ff]">
                  <Icone nom="lock" />
                </span>

                <div>
                  <h2 className="text-base font-bold text-[#3c0038]">
                    Sécurité
                  </h2>

                  <p className="text-xs text-slate-500">
                    Changez votre mot de passe
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Ancien mot de passe
                  </label>

                  <input
                    type="password"
                    value={passwords.ancien}
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        ancien: e.target.value,
                      })
                    }
                    required
                    placeholder="••••••••"
                    className={champStyle}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Nouveau mot de passe
                  </label>

                  <input
                    type="password"
                    value={passwords.nouveau}
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        nouveau: e.target.value,
                      })
                    }
                    required
                    placeholder="••••••••"
                    className={champStyle}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Confirmation
                  </label>

                  <input
                    type="password"
                    value={passwords.confirmation}
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        confirmation: e.target.value,
                      })
                    }
                    required
                    placeholder="••••••••"
                    className={`${champStyle} ${
                      passwords.confirmation &&
                      passwords.nouveau !== passwords.confirmation
                        ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                        : ""
                    }`}
                  />

                  {passwords.confirmation &&
                    passwords.nouveau !== passwords.confirmation && (
                      <p className="mt-1.5 text-xs font-medium text-rose-600">
                        Les mots de passe ne correspondent pas.
                      </p>
                    )}
                </div>
              </div>

              <button
                type="submit"
                disabled={enregistreMdp}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0097ff] to-[#0072d6] py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0097ff]/25 transition-all hover:shadow-lg hover:shadow-[#0097ff]/30 active:scale-[0.98] disabled:opacity-60"
              >
                <Icone nom="lock" className="h-4 w-4" />

                {enregistreMdp
                  ? "Mise à jour…"
                  : "Mettre à jour le mot de passe"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
