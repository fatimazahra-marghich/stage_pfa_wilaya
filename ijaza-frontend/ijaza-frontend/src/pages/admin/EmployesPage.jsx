import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import MainLayout from "../../components/MainLayout";

/* ------------------------------------------------------------------ */
/* Icônes                                                             */
/* ------------------------------------------------------------------ */

const Icone = ({ d, className = "h-4 w-4" }) => (
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
    {Array.isArray(d) ? (
      d.map((p, i) => <path key={i} d={p} />)
    ) : (
      <path d={d} />
    )}
  </svg>
);

const I = {
  plus: "M12 5v14M5 12h14",
  crayon: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z",
  corbeille: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6",
  loupe: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  personnes: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 010 7.75",
  personne: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  batiment: "M3 21h18M6 21V7l6-4 6 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h.01M15 17h.01",
  calendrier: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  croix: "M18 6L6 18M6 6l12 12",
  clef: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
};

/* ------------------------------------------------------------------ */
/* Rôles                                                              */
/* ------------------------------------------------------------------ */

const ROLES = {
  ADMIN: {
    label: "Administrateur",
    chip: "bg-[#3c0038]/10 text-[#3c0038]",
  },
  RH: {
    label: "RH Général",
    chip: "bg-[#93003f]/10 text-[#93003f]",
  },
  CHEF_SERVICE: {
    label: "Chef de Service",
    chip: "bg-[#0097ff]/10 text-[#0097ff]",
  },
  EMPLOYE: {
    label: "Employé",
    chip: "bg-neutral-100 text-neutral-600",
  },
};

export default function EmployesPage() {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [services, setServices] = useState([]);
  const [userEndpoint, setUserEndpoint] = useState("/users/");

  const [chargement, setChargement] = useState(true);

  const [recherche, setRecherche] = useState("");
  const [filtreRole, setFiltreRole] = useState("TOUS");
  const [filtreDivision, setFiltreDivision] = useState("TOUS");
  const [filtreService, setFiltreService] = useState("TOUS");

  const [formOuvert, setFormOuvert] = useState(false);
  const [empEnEdition, setEmpEnEdition] = useState(null);

  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    role: "EMPLOYE",
    division_id: "",
    service_id: "",
    solde_conge: 22,
    is_active: true,
  });

  const [erreursForm, setErreursForm] = useState({});
  const [erreurGlobale, setErreurGlobale] = useState("");

  const chargerDonnees = async () => {
    setChargement(true);
    
    const endpointsAessayer = ["/users/", "/users/utilisateurs/", "/utilisateurs/"];
    let resUsers = null;
    let endpointTrouve = "/users/";

    for (const ep of endpointsAessayer) {
      try {
        resUsers = await api.get(ep);
        endpointTrouve = ep;
        break;
      } catch (err) {
        if (err.response?.status !== 404) {
          console.error(`Erreur sur ${ep}:`, err);
        }
      }
    }

    setUserEndpoint(endpointTrouve);

    try {
      const [resDivisions, resServices] = await Promise.all([
        api.get("/organisation/divisions/").catch(() => ({ data: [] })),
        api.get("/organisation/services/").catch(() => ({ data: [] })),
      ]);

      const divData = Array.isArray(resDivisions.data) ? resDivisions.data : resDivisions.data?.results || [];
      const srvData = Array.isArray(resServices.data) ? resServices.data : resServices.data?.results || [];
      const usrData = resUsers ? (Array.isArray(resUsers.data) ? resUsers.data : resUsers.data?.results || []) : [];

      setDivisions(divData);
      setServices(srvData);
      setUtilisateurs(usrData);
    } catch (error) {
      console.error("Erreur de chargement globale :", error);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setFormOuvert(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const extraireId = (val) => (typeof val === "object" && val !== null ? val.id : val);

  const ouvrirFormulaire = (emp = null) => {
    setErreursForm({});
    setErreurGlobale("");
    if (emp) {
      setEmpEnEdition(emp);
      
      const srvId = extraireId(emp.service);
      const srv = services.find((s) => String(s.id) === String(srvId));
      const divId = extraireId(emp.division) || (srv ? extraireId(srv.division) : "");

      setForm({
        email: emp.email || "",
        first_name: emp.first_name || "",
        last_name: emp.last_name || "",
        password: "",
        role: emp.role || "EMPLOYE",
        division_id: divId || "",
        service_id: srvId || "",
        solde_conge: emp.solde_actuel ?? emp.solde_conge ?? 22,
        is_active: emp.is_active ?? true,
      });
    } else {
      setEmpEnEdition(null);
      setForm({
        email: "",
        first_name: "",
        last_name: "",
        password: "",
        role: "EMPLOYE",
        division_id: "",
        service_id: "",
        solde_conge: 22,
        is_active: true,
      });
    }
    setFormOuvert(true);
  };

  const modifierChamp = (champ, valeur) => {
    setForm((ancien) => ({ ...ancien, [champ]: valeur }));
    if (erreursForm[champ]) {
      setErreursForm((prev) => ({ ...prev, [champ]: null }));
    }
    setErreurGlobale("");
  };

  const validerFormulaire = () => {
    const erreurs = {};
    const emailLower = form.email.trim().toLowerCase();

    if (!emailLower.endsWith("@gmail.com")) {
      erreurs.email = "L'adresse email doit se terminer par @gmail.com";
    } else {
      const existeDeja = utilisateurs.some(
        (u) => u.email.toLowerCase() === emailLower && u.id !== empEnEdition?.id
      );
      if (existeDeja) {
        erreurs.email = "Cette adresse Gmail est déjà utilisée par un autre employé.";
      }
    }

    if (!empEnEdition && !form.password) {
      erreurs.password = "Le mot de passe est obligatoire pour la création.";
    }

    const soldeNum = Number(form.solde_conge);
    if (isNaN(soldeNum) || soldeNum < 0) {
      erreurs.solde_conge = "Le solde doit être un nombre positif.";
    }

    setErreursForm(erreurs);
    return Object.keys(erreurs).length === 0;
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErreurGlobale("");

    if (!validerFormulaire()) {
      return;
    }

    const emailTrimmed = form.email.trim();

    // Transmission explicite des champs division et service au backend
    const payload = {
      username: emailTrimmed,
      email: emailTrimmed,
      first_name: form.first_name,
      last_name: form.last_name,
      role: form.role,
      solde_conge: parseInt(form.solde_conge, 10),
      is_active: form.is_active,
      division: form.division_id ? parseInt(form.division_id, 10) : null,
      service: form.service_id ? parseInt(form.service_id, 10) : null,
    };

    if (form.password) {
      payload.password = form.password;
    }

    try {
      const urlBase = userEndpoint.endsWith("/") ? userEndpoint : `${userEndpoint}/`;
      if (empEnEdition) {
        await api.patch(`${urlBase}${empEnEdition.id}/`, payload);
      } else {
        await api.post(urlBase, payload);
      }
      setFormOuvert(false);
      chargerDonnees();
    } catch (err) {
      console.error("Erreur d'enregistrement :", err.response?.data || err);
      const apiData = err.response?.data;

      if (apiData && typeof apiData === "object") {
        const champErreurs = {};
        const messagesLibres = [];

        Object.entries(apiData).forEach(([cle, val]) => {
          const message = Array.isArray(val) ? val.join(" ") : String(val);
          if (["email", "first_name", "last_name", "password", "role", "service", "division", "solde_conge"].includes(cle)) {
            champErreurs[cle] = message;
          } else {
            messagesLibres.push(`${cle}: ${message}`);
          }
        });

        setErreursForm(champErreurs);
        if (messagesLibres.length > 0) {
          setErreurGlobale(messagesLibres.join(" | "));
        }
      } else {
        setErreurGlobale("Une erreur inattendue est survenue côté serveur.");
      }
    }
  }

  async function handleSupprimer(id, nomComplet) {
    if (!window.confirm(`Voulez-vous supprimer l'utilisateur "${nomComplet}" ?`)) return;

    try {
      const urlBase = userEndpoint.endsWith("/") ? userEndpoint : `${userEndpoint}/`;
      await api.delete(`${urlBase}${id}/`);
      chargerDonnees();
    } catch (err) {
      console.error("Erreur de suppression :", err);
      alert("Impossible de supprimer cet utilisateur.");
    }
  }

  const servicesFiltresForm = useMemo(() => {
    if (!form.division_id) return services;
    return services.filter((s) => String(extraireId(s.division)) === String(form.division_id));
  }, [services, form.division_id]);

  const employesFiltres = useMemo(() => {
    const q = recherche.toLowerCase();

    return utilisateurs.filter((e) => {
      const nomComplet = `${e.first_name || ""} ${e.last_name || ""}`.toLowerCase();
      const email = (e.email || "").toLowerCase();
      const matchTexte = nomComplet.includes(q) || email.includes(q);
      const matchRole = filtreRole === "TOUS" || e.role === filtreRole;

      const srvId = extraireId(e.service);
      const divId = extraireId(e.division) || (srvId ? extraireId(services.find((s) => String(s.id) === String(srvId))?.division) : null);

      const matchDiv = filtreDivision === "TOUS" || String(divId) === String(filtreDivision);
      const matchSrv = filtreService === "TOUS" || String(srvId) === String(filtreService);

      return matchTexte && matchRole && matchDiv && matchSrv;
    });
  }, [utilisateurs, services, recherche, filtreRole, filtreDivision, filtreService]);

  const stats = useMemo(() => {
    const total = utilisateurs.length;
    const actifs = utilisateurs.filter((e) => e.is_active).length;
    const congesTotal = utilisateurs.reduce((acc, e) => acc + (Number(e.solde_actuel ?? e.solde_conge) || 0), 0);

    return { total, actifs, congesTotal };
  }, [utilisateurs]);

  const champ = "w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-800 outline-none transition focus:border-[#0097ff] focus:ring-4 focus:ring-[#0097ff]/10";
  const labelCls = "mb-1.5 block text-xs font-semibold text-[#3c0038]";

  return (
    <MainLayout>
      <div className="min-h-full bg-gradient-to-b from-[#e7ffff] via-[#f4fdff] to-[#eef4ff] p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#3c0038] text-white shadow-sm">
                <Icone d={I.personnes} className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#3c0038]">
                  Gestion des Employés
                </h1>
                <p className="text-sm text-neutral-500">
                  Comptes d'accès, rôles et affectations aux divisions & services
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => ouvrirFormulaire()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3c0038] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#93003f] focus:outline-none focus:ring-4 focus:ring-[#3c0038]/10"
            >
              <Icone d={I.plus} />
              Ajouter un employé
            </button>
          </div>

          {/* Stats */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Total employés</p>
                  <p className="mt-1 text-3xl font-bold text-[#3c0038]">{stats.total}</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#3c0038]/10 text-[#3c0038]">
                  <Icone d={I.personnes} className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Employés actifs</p>
                  <p className="mt-1 text-3xl font-bold text-[#0097ff]">{stats.actifs}</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0097ff]/10 text-[#0097ff]">
                  <Icone d={I.personne} className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Solde congés total</p>
                  <p className="mt-1 text-3xl font-bold text-[#93003f]">{stats.congesTotal} jrs</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#93003f]/10 text-[#93003f]">
                  <Icone d={I.calendrier} className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="mb-6 rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className={labelCls}>Rechercher</label>
                <div className="relative">
                  <Icone d={I.loupe} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    placeholder="Nom ou email..."
                    className={`${champ} pl-10`}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Rôle</label>
                <select value={filtreRole} onChange={(e) => setFiltreRole(e.target.value)} className={champ}>
                  <option value="TOUS">Tous les rôles</option>
                  {Object.entries(ROLES).map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Division</label>
                <select value={filtreDivision} onChange={(e) => setFiltreDivision(e.target.value)} className={champ}>
                  <option value="TOUS">Toutes les divisions</option>
                  {divisions.map((div) => (
                    <option key={div.id} value={div.id}>{div.nom || div.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Service</label>
                <select value={filtreService} onChange={(e) => setFiltreService(e.target.value)} className={champ}>
                  <option value="TOUS">Tous les services</option>
                  {services.map((srv) => (
                    <option key={srv.id} value={srv.id}>{srv.nom || srv.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="border-b border-neutral-100 bg-neutral-50/80">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-neutral-500">Employé / Identifiant</th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-neutral-500">Rôle</th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-neutral-500">Division & Service</th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-neutral-500">Solde congé</th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-neutral-500">Statut</th>
                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-neutral-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {chargement ? (
                    <tr>
                      <td colSpan="6" className="px-5 py-12 text-center text-sm text-neutral-500">
                        Chargement des utilisateurs...
                      </td>
                    </tr>
                  ) : employesFiltres.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-5 py-12 text-center text-sm text-neutral-500">
                        Aucun utilisateur trouvé.
                      </td>
                    </tr>
                  ) : (
                    employesFiltres.map((emp) => {
                      const prenom = emp.first_name || "";
                      const nom = emp.last_name || "";
                      const nomComplet = `${prenom} ${nom}`.trim();
                      const role = ROLES[emp.role] || ROLES.EMPLOYE;

                      const divAssigne = divisions.find((d) => String(d.id) === String(extraireId(emp.division)))?.nom || emp.division_nom || "Non assignée";
                      const srvAssigne = services.find((s) => String(s.id) === String(extraireId(emp.service)))?.nom || emp.service_nom || "Non assigné";

                      return (
                        <tr key={emp.id} className="transition hover:bg-[#e7ffff]/40">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#3c0038] to-[#93003f] text-sm font-bold text-white">
                                {(prenom[0] || nom[0] || "?").toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#3c0038]">{nomComplet || "Sans nom"}</p>
                                <p className="truncate text-xs text-neutral-500">{emp.email} {emp.matricule && `(${emp.matricule})`}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${role.chip}`}>
                              {role.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-neutral-700">
                            <div className="font-semibold text-[#3c0038]">
                              Division : {divAssigne}
                            </div>
                            <div className="text-neutral-500">
                              Service : {srvAssigne}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-neutral-700">
                            {emp.solde_actuel ?? emp.solde_conge ?? 0} jrs
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${emp.is_active ? "bg-emerald-50 text-emerald-600" : "bg-neutral-100 text-neutral-500"}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${emp.is_active ? "bg-emerald-500" : "bg-neutral-400"}`} />
                              {emp.is_active ? "Actif" : "Inactif"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => ouvrirFormulaire(emp)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#0097ff]/20 text-[#0097ff] transition hover:bg-[#0097ff]/10">
                                <Icone d={I.crayon} />
                              </button>
                              <button onClick={() => handleSupprimer(emp.id, nomComplet)} className="grid h-9 w-9 place-items-center rounded-lg border border-red-100 text-red-500 transition hover:bg-red-50">
                                <Icone d={I.corbeille} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Ajout / Edition */}
      {formOuvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#3c0038]/40 backdrop-blur-sm" onClick={() => setFormOuvert(false)} />
          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-[#3c0038]">
                  {empEnEdition ? "Modifier l'employé" : "Ajouter un employé"}
                </h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Renseignez l'adresse Gmail, le mot de passe et l'affectation au service.
                </p>
              </div>
              <button onClick={() => setFormOuvert(false)} className="grid h-9 w-9 place-items-center rounded-xl text-neutral-400 hover:bg-neutral-100">
                <Icone d={I.croix} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {erreurGlobale && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
                  {erreurGlobale}
                </div>
              )}

              {/* Noms */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Prénom *</label>
                  <input type="text" value={form.first_name} onChange={(e) => modifierChamp("first_name", e.target.value)} className={champ} placeholder="Jean" required />
                  {erreursForm.first_name && <p className="mt-1 text-xs font-medium text-red-500">{erreursForm.first_name}</p>}
                </div>
                <div>
                  <label className={labelCls}>Nom *</label>
                  <input type="text" value={form.last_name} onChange={(e) => modifierChamp("last_name", e.target.value)} className={champ} placeholder="Dupont" required />
                  {erreursForm.last_name && <p className="mt-1 text-xs font-medium text-red-500">{erreursForm.last_name}</p>}
                </div>
              </div>

              {/* Identifiants Connexion */}
              <div className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[#3c0038] uppercase tracking-wide">
                  <Icone d={I.clef} className="h-4 w-4 text-[#93003f]" /> Identifiants de Connexion
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Adresse Gmail (Unique) *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => modifierChamp("email", e.target.value)}
                      className={`${champ} ${erreursForm.email ? "border-red-500 focus:ring-red-200" : ""}`}
                      placeholder="employe@gmail.com"
                      required
                    />
                    {erreursForm.email && (
                      <p className="mt-1 text-xs font-medium text-red-500">{erreursForm.email}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>
                      Mot de passe {empEnEdition && <span className="font-normal text-neutral-400">(vide pour inchangé)</span>}
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => modifierChamp("password", e.target.value)}
                      className={`${champ} ${erreursForm.password ? "border-red-500 focus:ring-red-200" : ""}`}
                      placeholder="••••••••"
                      required={!empEnEdition}
                    />
                    {erreursForm.password && (
                      <p className="mt-1 text-xs font-medium text-red-500">{erreursForm.password}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Rôle et Rattachements */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelCls}>Rôle</label>
                  <select value={form.role} onChange={(e) => modifierChamp("role", e.target.value)} className={champ}>
                    {Object.entries(ROLES).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                  {erreursForm.role && <p className="mt-1 text-xs font-medium text-red-500">{erreursForm.role}</p>}
                </div>

                <div>
                  <label className={labelCls}>Division de rattachement</label>
                  <select 
                    value={form.division_id} 
                    onChange={(e) => {
                      modifierChamp("division_id", e.target.value);
                      modifierChamp("service_id", "");
                    }} 
                    className={champ}
                  >
                    <option value="">— Sans division —</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>{d.nom || d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Service de rattachement</label>
                  <select value={form.service_id} onChange={(e) => modifierChamp("service_id", e.target.value)} className={champ}>
                    <option value="">— Sans service —</option>
                    {servicesFiltresForm.map((s) => (
                      <option key={s.id} value={s.id}>{s.nom || s.name}</option>
                    ))}
                  </select>
                  {erreursForm.service && <p className="mt-1 text-xs font-medium text-red-500">{erreursForm.service}</p>}
                </div>
              </div>

              {/* Solde de congé */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Solde de congé initial (jours)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.solde_conge}
                    onChange={(e) => modifierChamp("solde_conge", e.target.value)}
                    className={`${champ} ${erreursForm.solde_conge ? "border-red-500 focus:ring-red-200" : ""}`}
                  />
                  {erreursForm.solde_conge && (
                    <p className="mt-1 text-xs font-medium text-red-500">{erreursForm.solde_conge}</p>
                  )}
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => modifierChamp("is_active", e.target.checked)} className="h-5 w-5 rounded border-neutral-300 text-[#3c0038] focus:ring-[#0097ff]" />
                    <span className="text-sm font-semibold text-[#3c0038]">Compte actif (Connexion autorisée)</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-neutral-100 pt-5">
                <button type="button" onClick={() => setFormOuvert(false)} className="rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50">
                  Annuler
                </button>
                <button type="submit" className="rounded-xl bg-[#3c0038] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#93003f]">
                  {empEnEdition ? "Enregistrer les modifications" : "Créer l'employé"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}